import { test, expect } from "@playwright/test";

test.describe("Ops Console: End-to-End Operational Lifecycle", () => {
  test("delay a flight -> preview shows cascading impact -> confirm -> board updates live", async ({
    page
  }) => {
    // 1. Navigate to Ops Console
    await page.goto("/");

    // Verify header and gate grid
    await expect(page.getByText("C3 Airport Operations Console")).toBeVisible();
    await expect(page.getByTestId("gate-allocation-grid")).toBeVisible();

    // Verify initial gate occupancy: fl_101 and fl_202 at Gate A1
    const gateA1Column = page.getByTestId("gate-column-gate_A1");
    await expect(gateA1Column.getByTestId("flight-card-fl_101")).toBeVisible();
    await expect(gateA1Column.getByTestId("flight-card-fl_202")).toBeVisible();

    // 2. Click "Simulate Delay" on Flight AA101 (fl_101)
    await page.getByTestId("simulate-delay-btn-fl_101").click();

    // Verify simulation modal opens
    const modal = page.getByTestId("delay-simulation-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Simulate Flight Delay: AA101")).toBeVisible();

    // 3. Select +60m delay and click Compute Cascading Knock-On Preview
    await modal.getByTestId("preset-delay-60").click();
    await modal.getByTestId("run-simulation-btn").click();

    // 4. Verify preview panel shows cascading impact
    const previewPanel = modal.getByTestId("simulation-preview-panel");
    await expect(previewPanel).toBeVisible();

    // Assert that the preview details gate displacement and baggage rerouting
    await expect(
      modal.getByText(/Bumping flight fl_202 because flight AA101 delayed/i)
    ).toBeVisible();
    await expect(modal.getByText(/Baggage route redirected/i)).toBeVisible();

    // 5. Confirm & Commit Changes
    await modal.getByTestId("confirm-commit-btn").click();

    // Verify modal closes
    await expect(modal).not.toBeVisible();

    // 6. Verify live board update:
    // fl_101 remains at Gate A1 with "DELAYED" badge
    await expect(gateA1Column.getByText("DELAYED").first()).toBeVisible();

    // fl_202 has been bumped out of Gate A1 and into Gate A4
    await expect(gateA1Column.getByTestId("flight-card-fl_202")).not.toBeVisible();
    const gateA4Column = page.getByTestId("gate-column-gate_A4");
    await expect(gateA4Column.getByTestId("flight-card-fl_202")).toBeVisible();

    // 7. Verify live audit feed displays the new impact event
    const auditFeed = page.getByTestId("live-audit-feed");
    await expect(auditFeed.getByText(/Flight fl_202/i).first()).toBeVisible();
  });
});
