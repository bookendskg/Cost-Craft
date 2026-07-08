import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

// Control categories loading.
let categoriesData: string[] = [];
vi.mock("@/features/settings/hooks", () => ({
  useCategories: () => ({ data: categoriesData }),
}));
vi.mock("./hooks", () => ({
  useMaterial: () => ({ data: undefined, isLoading: false }),
  useCreateMaterial: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMaterial: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { MaterialEditorPage } from "./MaterialEditorPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: "/materials/new", element: <MaterialEditorPage /> },
      { path: "/materials", element: <div>MATERIALS LIST</div> },
    ],
    { initialEntries: ["/materials", "/materials/new"], initialIndex: 1 },
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("REPRO: pristine Add Ingredient → Cancel should not prompt", () => {
  beforeEach(() => {
    categoriesData = [];
  });

  it("categories empty at mount then load; untouched Cancel must leave", async () => {
    const { rerender } = renderPage();
    await screen.findByText("Add Ingredient");
    // categories load after mount:
    categoriesData = ["Vegetables", "Dairy"];
    await act(async () => {
      rerender(<div />); // force a re-render path is not enough; re-render router below
      await new Promise((r) => setTimeout(r, 20));
    });

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    const discard = screen.queryByText(/Discard Changes\?/i);
    // eslint-disable-next-line no-console
    console.log("A) DISCARD =", !!discard, "LIST =", !!screen.queryByText("MATERIALS LIST"));
    expect(discard).not.toBeInTheDocument();
  });

  it("categories already loaded at mount; untouched Cancel must leave", async () => {
    categoriesData = ["Vegetables", "Dairy"];
    renderPage();
    await screen.findByText("Add Ingredient");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    const discard = screen.queryByText(/Discard Changes\?/i);
    // eslint-disable-next-line no-console
    console.log("B) DISCARD =", !!discard, "LIST =", !!screen.queryByText("MATERIALS LIST"));
    expect(discard).not.toBeInTheDocument();
  });
});
