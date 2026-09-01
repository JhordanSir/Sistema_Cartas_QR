import { render, screen } from "@testing-library/react";

import HomePage from "./page";

describe("HomePage", () => {
  it("explica el sistema y dirige al propietario a su acceso", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /tu carta trabaja/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ingresar como propietario/i }),
    ).toHaveAttribute("href", "/admin/login");
    expect(screen.getByAltText("Logo de Sirio Automatiza")).toBeInTheDocument();
  });
});
