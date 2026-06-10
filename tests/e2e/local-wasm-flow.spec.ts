import { expect, test } from "@playwright/test";

test("runs local wasm DPS flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("已登录")).toBeVisible();
  await expect(page.getByRole("heading", { name: /冰法 DPS 模拟/i })).toBeVisible();

  await page.getByLabel("SimC Profile").fill(`mage=Demo
spec=frost
level=80
race=human
role=spell
position=back
talents=
`);
  await page.getByLabel("Fight Length").selectOption("20");
  await page.getByLabel("Threads").fill("4");
  await page.getByLabel("High Precision").uncheck();
  await page.getByRole("button", { name: /开始模拟/i }).click();

  await expect(page).toHaveURL(/\/sims\/local_/, {
    timeout: 180000,
  });
  await expect(page.getByText(/任务状态/i)).toBeVisible({
    timeout: 30000,
  });
});
