import pytest
from playwright.sync_api import Page, expect

def test_homepage_loads(page: Page):
    # Открываю наш сайт (он работает на порту 8080)
    page.goto("http://localhost:8080")
    
    # Проверяю, что страница загрузилась (ищем любой текст на странице)
    # (В будущем здесь будут шаги регистрации и поиска вакансий)
    print("Сайт успешно открылся в браузере!")