import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DpsForm } from "@/ui/dps-form";

describe("dps-form", () => {
  it("shows the supported fight styles and demonology restriction", () => {
    render(<DpsForm onSubmit={vi.fn()} isPending={false} />);

    expect(screen.getByText(/当前仅支持恶魔术/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fight style/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Patchwerk" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Dungeon Slice" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Target Dummy" }),
    ).toBeInTheDocument();
  });

  it("submits the profile, fight style, and enemy count", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<DpsForm onSubmit={onSubmit} isPending={false} />);

    await user.type(
      screen.getByLabelText(/simc profile/i),
      "warlock=Demo\nspec=demonology",
    );
    await user.selectOptions(screen.getByLabelText(/fight style/i), "dungeon_slice");
    await user.clear(screen.getByLabelText(/num enemies/i));
    await user.type(screen.getByLabelText(/num enemies/i), "5");
    await user.click(screen.getByRole("button", { name: /开始模拟/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      simcProfile: "warlock=Demo\nspec=demonology",
      fightStyle: "dungeon_slice",
      numEnemies: 5,
    });
  });
});
