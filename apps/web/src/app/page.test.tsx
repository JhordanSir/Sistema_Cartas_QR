import { render, screen } from "@testing-library/react";

import HomePage from "./page";

describe("HomePage", () => {
  it("muestra la propuesta y el canal de contacto", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /tu carta digital/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /whatsapp/i }),
    ).toHaveAttribute("href", "https://wa.me/51973502261");
  });
});
