import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const GITHUB_OWNER = "rimz178";
const GITHUB_REPO = "lounas-app";
const WORKFLOW_ID = "refresh-lunches.yml";
const WORKFLOW_REF = "main";
const ACTIVE_RUN_STATUSES = new Set([
  "queued",
  "in_progress",
  "pending",
  "requested",
  "waiting",
]);

type GithubWorkflowRun = {
  id: number;
  html_url: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_number: number;
};

type GithubWorkflowRunsResponse = {
  workflow_runs: GithubWorkflowRun[];
};

type GithubJobStep = {
  name: string;
  status: string;
};

type GithubJob = {
  steps?: GithubJobStep[];
};

type GithubJobsResponse = {
  jobs: GithubJob[];
};

type RefreshRunStatus = {
  id: number;
  url: string;
  status: string;
  conclusion: string | null;
  runNumber: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  totalSteps: number;
  completedSteps: number;
  progressPercent: number | null;
  currentStep: string | null;
};

type AuthorizedContext = {
  githubToken: string;
};

function getConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!supabaseUrl || !serviceRoleKey || !githubToken) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey, githubToken };
}

async function authorizeAdmin(
  req: NextRequest,
): Promise<{ response: NextResponse } | { context: AuthorizedContext }> {
  const config = getConfig();
  if (!config) {
    return {
      response: NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      ),
    };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey);
  const token = authHeader.replace("Bearer ", "").trim();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { context: { githubToken: config.githubToken } };
}

async function githubFetch<T>(
  path: string,
  githubToken: string,
  init?: RequestInit,
) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function getLatestWorkflowRun(githubToken: string) {
  const params = new URLSearchParams({
    per_page: "10",
    event: "workflow_dispatch",
    branch: WORKFLOW_REF,
  });

  const data = await githubFetch<GithubWorkflowRunsResponse>(
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/runs?${params.toString()}`,
    githubToken,
  );

  return data.workflow_runs[0] ?? null;
}

async function getRunProgress(runId: number, githubToken: string) {
  try {
    const data = await githubFetch<GithubJobsResponse>(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/jobs?per_page=100`,
      githubToken,
    );

    const steps = data.jobs.flatMap((job) => job.steps ?? []);
    const totalSteps = steps.length;
    const completedSteps = steps.filter(
      (step) => step.status === "completed",
    ).length;
    const currentStep =
      steps.find((step) => step.status === "in_progress")?.name ??
      steps.find((step) => step.status !== "completed")?.name ??
      null;

    return { totalSteps, completedSteps, currentStep };
  } catch {
    return { totalSteps: 0, completedSteps: 0, currentStep: null };
  }
}

async function serializeRunStatus(
  run: GithubWorkflowRun,
  githubToken: string,
): Promise<RefreshRunStatus> {
  const { totalSteps, completedSteps, currentStep } = await getRunProgress(
    run.id,
    githubToken,
  );
  const progressPercent =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : null;

  return {
    id: run.id,
    url: run.html_url,
    status: run.status,
    conclusion: run.conclusion,
    runNumber: run.run_number,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    isActive: ACTIVE_RUN_STATUSES.has(run.status),
    totalSteps,
    completedSteps,
    progressPercent,
    currentStep,
  };
}

async function waitForWorkflowRun(
  previousRunId: number | null,
  githubToken: string,
) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const latestRun = await getLatestWorkflowRun(githubToken);
    if (latestRun && latestRun.id !== previousRunId) {
      return latestRun;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const auth = await authorizeAdmin(req);
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const latestRun = await getLatestWorkflowRun(auth.context.githubToken);
    if (!latestRun) {
      return NextResponse.json({ run: null });
    }

    return NextResponse.json({
      run: await serializeRunStatus(latestRun, auth.context.githubToken),
    });
  } catch {
    return NextResponse.json(
      { error: "Refresh status unavailable" },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeAdmin(req);
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const latestRun = await getLatestWorkflowRun(auth.context.githubToken);
    if (latestRun && ACTIVE_RUN_STATUSES.has(latestRun.status)) {
      return NextResponse.json({
        started: false,
        message: "Päivitys on jo käynnissä.",
        run: await serializeRunStatus(latestRun, auth.context.githubToken),
      });
    }

    const previousRunId = latestRun?.id ?? null;

    await githubFetch(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      auth.context.githubToken,
      {
        method: "POST",
        body: JSON.stringify({ ref: WORKFLOW_REF }),
      },
    );

    const startedRun = await waitForWorkflowRun(
      previousRunId,
      auth.context.githubToken,
    );

    return NextResponse.json({
      started: true,
      message: "Päivitys käynnistetty.",
      run: startedRun
        ? await serializeRunStatus(startedRun, auth.context.githubToken)
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Päivityksen käynnistys epäonnistui" },
      { status: 502 },
    );
  }
}
