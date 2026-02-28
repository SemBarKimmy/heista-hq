import { expect, test } from '@playwright/test'

const TEST_PREFIX = `e2e-${Date.now()}`

test.describe('Tier-2 core flows', () => {
  test('tasks: add card, move card, and persistence after reload', async ({ page }) => {
    const cardTitle = `${TEST_PREFIX}-card`

    await page.goto('/tasks')

    const todoColumn = page.getByTestId('column-col-1')
    await expect(todoColumn).toBeVisible()

    await todoColumn.getByTestId('add-card-trigger').click()
    await todoColumn.getByTestId('new-task-input').fill(cardTitle)
    await todoColumn.getByTestId('confirm-add-task').click()

    const createdCard = page.getByTestId(`task-card-${cardTitle}`)
    await expect(createdCard).toBeVisible()

    const inProgressColumn = page.getByTestId('column-col-2')
    await dragCardToColumn(page, createdCard, inProgressColumn)

    await expect(inProgressColumn.getByTestId(`task-card-${cardTitle}`)).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('column-col-2').getByTestId(`task-card-${cardTitle}`)).toBeVisible()
  })

  test('logs: new activity log is visible after task action', async ({ page }) => {
    const logCard = `${TEST_PREFIX}-log-card`

    await page.goto('/tasks')
    const todoColumn = page.getByTestId('column-col-1')
    await todoColumn.getByTestId('add-card-trigger').click()
    await todoColumn.getByTestId('new-task-input').fill(logCard)
    await todoColumn.getByTestId('confirm-add-task').click()

    await page.goto('/logs')
    await expect(page.getByTestId('agent-log-stream')).toContainText(`Added new task: "${logCard}"`)
  })

  test('theme toggle updates html class', async ({ page }) => {
    await page.goto('/')

    const html = page.locator('html')
    const hadDark = (await html.getAttribute('class'))?.includes('dark') ?? false

    await page.getByTestId('theme-toggle').click()

    await expect
      .poll(async () => ((await html.getAttribute('class')) || '').includes('dark'))
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
