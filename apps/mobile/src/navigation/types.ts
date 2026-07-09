export type RootStackParamList = {
  Tabs: undefined;
  Settings: undefined;
  Login: undefined;
  Menu: {
    restaurantId: string;
    restaurantName: string;
    initialMenu?: string | null;
  };
};

export type BottomTabParamList = {
  Kartta: { openSearchAt?: number } | undefined;
  Lounaspaikat: { openSearchAt?: number } | undefined;
};
