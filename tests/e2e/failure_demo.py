from playwright.sync_api import Page, expect


def test_failure_demo(page: Page):
    page.goto("http://frontend:80")

    # Специально ожидаем неправильный заголовок
    expect(page).to_have_title(
        "Несуществующий заголовок для демонстрации"
    )
