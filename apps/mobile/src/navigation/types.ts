export type RootStackParamList = {
  Tabs: undefined;
  Menu: {
    restaurantId: string;
    restaurantName: string;
    initialMenu?: string | null;
  };
};

export type TopTabParamList = {
  Lista: { openSearchAt?: number } | undefined;
  Kartta: { openSearchAt?: number } | undefined;
};
