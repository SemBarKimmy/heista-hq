import { expect, test } from '@playwright/test'

const TEST_PREFIX = `e2e-${Date.now()}`

test.describe('Tier-2 core flows', () => {
  test('tasks: add card, move card, and persistence after reload', async ({ page }) => {
    const cardTitle = `${TEST_PREFIX}-card`

    await page.goto('/tasks')

    const todoColumn = page.getByTestId('column-col-1')
    await expect(todoColumn).toBeVisible()

    // Add task
    await todoColumn.getByTestId('add-card-trigger').click()
    await todoColumn.getByTestId('new-task-input').fill(cardTitle)
    await todoColumn.getByTestId('confirm-add-task').click()

    // Wait for card to appear in DOM
    const createdCard = page.getByTestId(`task-card-${cardTitle}`)
    await expect(createdCard).toBeVisible()

    // Move card to In Progress column
    const inProgressColumn = page.getByTestId('column-col-2')
    
    // Perform drag with extra steps and wait time
    await dragCardToColumn(page, createdCard, inProgressColumn)
    
    // Wait a moment for drag to complete and API to process
    await page.waitForTimeout(800)

    // Card should be visible in new column
    await expect(inProgressColumn.getByTestId(`task-card-${cardTitle}`)).toBeVisible({ timeout: 10000 })

    // Reload and verify persistence
    await page.reload()
    await expect(page.getByTestId('column-col-2').getByTestId(`task-card-${cardTitle}`)).toBeVisible({ timeout: 15000 })
  })

  test('logs: new activity log is visible after task action', async ({ page }) => {
    const logCard = `${TEST_PREFIX}-log-card`

    await page.goto('/tasks')
    const todoColumn = page.getByTestId('column-col-1')
    await todoColumn.getByTestId('add-card-trigger').click()
    await todoColumn.getByTestId('new-task-input').fill(logCard)
    await todoColumn.getByTestId('confirm-add-task').click()

    // Wait for task to be created and logged
    await page.waitForTimeout(1000)

    await page.goto('/logs')
    
    // Poll with longer timeout for log to appear (depends on backend)
    await expect(page.getByTestId('agent-log-stream')).toContainText(`Added new task: "${logCard}"`, { timeout: 15000 })
  })

  test('theme toggle updates html class', async ({ page }) => {
    await page.goto('/')

    // Wait for theme provider to be mounted
    await page.waitForTimeout(500)

    const html = page.locator('html')
    const hadDark = (await html.getAttribute('class'))?.includes('dark') ?? false

    const themeToggle = page.getByTestId('theme-toggle')
    await expect(themeToggle).toBeVisible()
    await themeToggle.click()

    // Wait for theme change with longer timeout
    await expect
      .poll(async () => ((await html.getAttribute('class')) || '').includes('dark'), { timeout: 10000 })
      .toBe(!hadDark)
  })
})

async function dragCardToColumn(
  page: import('@playwright/test').Page,
  card: import('@playwright/test').Locator,
  column: import('@playwright/test').Locator
) {
  const cardBox = await card.boundingBox()
  const columnBox = await column.boundingBox()

  if (!cardBox || !columnBox) {
    throw new Error('Unable to resolve drag source/target positions')
  }

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + Math.min(columnBox.height - 20, 120), {
    steps: 12,
  })
  await page.mouse.up()
}
