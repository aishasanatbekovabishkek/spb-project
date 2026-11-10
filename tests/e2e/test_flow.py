import pytest
from playwright.sync_api import Page, expect
import time

def test_user_registration_and_login(page: Page):
    # 1. Открываю сайт (внутри Docker используем имя сервиса frontend)
    print("ШАГ 1: Открываю сайт")
    page.goto("http://frontend:80")
    
    # 2. Нажимаю кнопку "Войти"
    print("ШАГ 2: Нажимаю 'Войти'")
<<<<<<< HEAD
    login_btn = page.locator("text=Войти").first
    expect(login_btn).to_be_visible()
    login_btn.click()
    
    # 3. Переключаюсь на вкладку "Регистрация"
    print("ШАГ 3: Переключаюсь на 'Регистрация'")
    reg_tab = page.locator("text=Регистрация").first
    expect(reg_tab).to_be_visible()
    reg_tab.click()
=======
    page.click("text=Войти")
    
    # 3. Переключаюсь на вкладку "Регистрация"
    print("ШАГ 3: Переключаюсь на 'Регистрация'")
    page.click("text=Регистрация")
>>>>>>> origin/main
    
    # 4. Заполняю форму (генерирую случайную почту, чтобы не было конфликтов)
    print("ШАГ 4: Заполняю форму")
    test_email = f"test_{int(time.time())}@example.com"
    page.fill("input[type='email']", test_email)
    page.fill("input[type='password']", "Password123!")
    
    # 5. Нажимаю кнопку "Создать аккаунт"
    print("ШАГ 5: Нажимаю 'Создать аккаунт'")
    page.click("text=Создать аккаунт")
    
<<<<<<< HEAD
    # 6. ПРОВЕРКА АВТОРИЗАЦИИ: Жду появления кнопки "Выйти"
    print("ШАГ 6: Проверяю кнопку 'Выйти'")
    expect(page.locator("text=Выйти").first).to_be_visible(timeout=5000)
=======
    # 6. ПРОВЕРКА АВТОРИЗАЦИИ: Жду появления кнопки "Выйти" (её нет у неавторизованных)
    print("ШАГ 6: Проверяю кнопку 'Выйти'")
    expect(page.locator("text=Выйти")).to_be_visible(timeout=5000)
>>>>>>> origin/main
    print(f"Успешная регистрация с почтой: {test_email}")
    
    # 7. Переход в защищенный раздел "Вакансии"
    print("ШАГ 7: Перехожу в 'Вакансии'")
<<<<<<< HEAD
    vacancies_link = page.locator("text=Вакансии").first
    expect(vacancies_link).to_be_visible()
    vacancies_link.click()
    expect(page.locator("h1:has-text('Поиск вакансий')")).to_be_visible(timeout=5000)
    
        # 8. Поиск вакансии по ключевому слову "Python"
    print("ШАГ 8: Ищу вакансию 'Python'")
    search_input = page.locator("input[aria-label='Поиск вакансий']")
    expect(search_input).to_be_visible()
    search_input.fill("Python")
    
    # ДОБАВЛЯЕМ ПАУЗУ: даем сайту 1 секунду, чтобы разблокировать кнопку
    page.wait_for_timeout(1000) 
    
    search_btn = page.locator("button:has-text('Найти')")
    expect(search_btn).to_be_enabled(timeout=5000) # Ждем до 5 секунд
    search_btn.click()
    
    expect(page.locator("text=Программист Python").first).to_be_visible(timeout=10000)
    
    # 9. Сохранение вакансии (ждем, пока кнопка станет активной)
    print("ШАГ 9: Нажимаю 'Сохранить'")
    save_btn = page.locator("button:has-text('Сохранить')").first
    expect(save_btn).to_be_enabled(timeout=10000)
    save_btn.click()
=======
    page.locator("text=Вакансии").first.click()
    expect(page.locator("h1:has-text('Поиск вакансий')")).to_be_visible(timeout=5000)
    
    # 8. Поиск вакансии по ключевому слову "Python"
    print("ШАГ 8: Ищу вакансию 'Python'")
    page.fill("input[aria-label='Поиск вакансий']", "Python")
    page.click("button:has-text('Найти')")
    expect(page.get_by_role("heading", name="Python-разработчик")).to_be_visible(timeout=10000)
    
    # 9. Сохранение вакансии (ждем, пока кнопка станет активной)
    print("ШАГ 9: Нажимаю 'Сохранить'")
    expect(page.locator("button:has-text('Сохранить')").first).to_be_enabled(timeout=10000)
    page.locator("button:has-text('Сохранить')").first.click()
>>>>>>> origin/main
    print("Вакансия сохранена!")
    
    # 10. СОЗДАНИЕ ОТКЛИКА 
    print("ШАГ 10: Пытаюсь добавить отклик")
<<<<<<< HEAD
    
    # Ищем кнопку по её классу (api-primary-button)
    apply_button = page.locator("button.api-primary-button").first
    
    # Ждем, пока она станет активной (это заменит жесткий wait_for_timeout(2000))
    # Если кнопка появляется после сохранения вакансии, Playwright сам подождет её появления.
=======
    # Ждем 2 секунды, чтобы уведомление о сохранении исчезло
    page.wait_for_timeout(2000) 
    
    # Ищем кнопку по её классу (api-primary-button), так как это надежнее текста
    apply_button = page.locator("button.api-primary-button").first
    
    # Ждем, пока она станет активной
>>>>>>> origin/main
    expect(apply_button).to_be_enabled(timeout=10000)
    
    # Нажимаем
    apply_button.click()
    print("Нажал на 'Добавить отклик'")
    
    # Ждем появления сообщения об успехе
    expect(page.locator("text=добавлен в трекер")).to_be_visible(timeout=5000)
    print("Отклик успешно создан!")
    
    # 11. Переход в раздел "Мои отклики"
    print("ШАГ 11: Перехожу в 'Мои отклики'")
<<<<<<< HEAD
    my_responses_link = page.locator("text=Мои отклики").first
    expect(my_responses_link).to_be_visible()
    my_responses_link.click()
=======
    page.locator("text=Мои отклики").first.click()
>>>>>>> origin/main
    expect(page.locator("h1:has-text('Мои отклики')")).to_be_visible(timeout=5000)
    
    # 12. Изменение статуса отклика на "Собеседование с HR"
    print("ШАГ 12: Меняю статус")
<<<<<<< HEAD
    status_select = page.locator("select[aria-label='Изменить статус отклика']").first
    expect(status_select).to_be_visible()
    status_select.select_option(label="Собеседование с HR")
    
    # 13. Просмотр истории изменений (ждем, пока кнопка станет активной)
    print("ШАГ 13: Открываю историю")
    history_btn = page.locator("text=Показать историю").first
    expect(history_btn).to_be_enabled(timeout=10000)
    history_btn.click()
    expect(page.locator("text=История").first).to_be_visible(timeout=5000)
    
=======
    page.locator("select[aria-label='Изменить статус отклика']").select_option(label="Собеседование с HR")
    
    # 13. Просмотр истории изменений (ждем, пока кнопка станет активной)
    print("ШАГ 13: Открываю историю")
    expect(page.locator("text=Показать историю")).to_be_enabled(timeout=10000)
    page.locator("text=Показать историю").click()
    expect(page.locator("text=История")).to_be_visible(timeout=5000)
>>>>>>> origin/main
    print("ВСЕ ШАГИ ПРОЙДЕНЫ УСПЕШНО!")