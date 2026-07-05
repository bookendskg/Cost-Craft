import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarShowcase } from "./SidebarShowcase";

// The sidebar brand quote card shows the selected brand's first quote on mount.

describe("SidebarShowcase — brand quote card", () => {
  it("shows Capiche's quote for the Capiche brand", () => {
    render(<SidebarShowcase brand="capiche" />);
    expect(screen.getByText(/always pizza time/i)).toBeInTheDocument();
  });

  it("shows Aiko's quote for the Aiko brand", () => {
    render(<SidebarShowcase brand="aiko" />);
    expect(screen.getByText(/Asian Inspired Komfort/i)).toBeInTheDocument();
  });

  it("falls back to the Bookends quote for 'all'", () => {
    render(<SidebarShowcase brand="all" />);
    expect(screen.getByText(/unreasonable hospitality/i)).toBeInTheDocument();
  });
});
