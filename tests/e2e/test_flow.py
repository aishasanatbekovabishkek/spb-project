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
    
    # 7. ПРОВЕРКА ЗАЩИЩЕННОГО РАЗДЕЛА: Перехожу на страницу "Вакансии"
    page.locator("text=Вакансии").first.click()
    
    # Жду, пока загрузятся данные (проверяю, что появился заголовок "Поиск вакансий")
    expect(page.locator("h1:has-text('Поиск вакансий')")).to_be_visible(timeout=5000)
    
    print("Переход в защищенный раздел 'Вакансии' выполнен успешно!")