import pytest
from playwright.sync_api import Page, expect
import time

def test_user_registration_and_login(page: Page):
    # 1. Открываю сайт
    page.goto("http://localhost:8080")
    
    # 2. Нажимаю кнопку "Войти" в правом верхнем углу
    page.click("text=Войти")
    
    # 3. Переключаюсь на вкладку "Регистрация"
    page.click("text=Регистрация")
    
    # 4. Заполняю форму (генерирую случайную почту, чтобы не было ошибки "пользователь уже существует")
    test_email = f"test_{int(time.time())}@example.com"
    
    page.fill("input[type='email']", test_email)
    page.fill("input[type='password']", "Password123!")
    
    # 5. Нажимаю кнопку "Создать аккаунт"
    page.click("text=Создать аккаунт")
    
    # 6. Жду, пока загрузится главная страница после регистрации
    # Проверяю, что появился текст "Мои отклики" в меню слева
    expect(page.locator("text=Мои отклики")).to_be_visible(timeout=5000)
    
    print(f"Успешная регистрация и вход с почтой: {test_email}")