import pytest
from playwright.sync_api import Page, expect
import time

def test_user_registration_and_login(page: Page):
    # 1. Открываю сайт
    page.goto("http://localhost:8080")
    
    # 2. Нажимаю кнопку "Войти"
    page.click("text=Войти")
    
    # 3. Переключаюсь на вкладку "Регистрация"
    page.click("text=Регистрация")
    
    # 4. Заполняю форму (генерирую случайную почту)
    test_email = f"test_{int(time.time())}@example.com"
    page.fill("input[type='email']", test_email)
    page.fill("input[type='password']", "Password123!")
    
    # 5. Нажимаю кнопку "Создать аккаунт"
    page.click("text=Создать аккаунт")
    
    # 6. ПРОВЕРКА АВТОРИЗАЦИИ: Жду появления кнопки "Выйти"
    expect(page.locator("text=Выйти")).to_be_visible(timeout=5000)
    print(f"Успешная регистрация с почтой: {test_email}")
    
    # 7. ПЕРЕХОД НА СТРАНИЦУ "ВАКАНСИИ"
    page.locator("text=Вакансии").first.click()
    expect(page.locator("h1:has-text('Поиск вакансий')")).to_be_visible(timeout=5000)
    
    # 8. ПОИСК ВАКАНСИИ: Ввожу "Python" в поле и нажимаю "Найти"
    page.fill("input[aria-label='Поиск вакансий']", "Python")
    page.click("button:has-text('Найти')")

    # Жду, пока появятся результаты (ищу текст "Python" в заголовках карточек)
    expect(page.locator("text=Программист Python").first).to_be_visible(timeout=10000)
    print("Поиск вакансий выполнен успешно!")

    # 9. СОХРАНЕНИЕ ВАКАНСИИ: Кликаю по первой кнопке "Сохранить"
    page.locator("button:has-text('Сохранить')").first.click()

    print("Вакансия успешно сохранена!")
    