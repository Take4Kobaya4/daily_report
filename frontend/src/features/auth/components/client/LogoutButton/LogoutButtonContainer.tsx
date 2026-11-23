"use client";

import { LogoutButtonPresenter } from "./LogoutButtonPresenter";
import { useLogout } from "./useLogout";

export function LogoutButtonContainer() {
  const { isPending, errorMessage, handleLogout } = useLogout();

  return (
    <LogoutButtonPresenter
      isPending={isPending}
      errorMessage={errorMessage}
      onLogout={handleLogout}
    />
  );
}
