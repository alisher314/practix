document.addEventListener('DOMContentLoaded', () => {
    // --- Элементы DOM для экранов ---
    const splashScreen = document.getElementById('splashScreen'); // НОВАЯ КОНСТАНТА ДЛЯ ЗАСТАВКИ
    const mainContainer = document.querySelector('.container'); // Главный контейнер, который содержит все экраны
    const mainMenu = document.getElementById('mainMenu');
    const gameScreen = document.getElementById('gameScreen');
    const addEditModal = document.getElementById('addEditModal');
    const deleteModal = document.getElementById('deleteModal');

    // --- Элементы DOM для кнопок меню ---
    const startGameButton = document.getElementById('startGameButton');
    const showAddEditModalButton = document.getElementById('showAddEditModalButton');
    const showDeleteModalButton = document.getElementById('showDeleteModalButton');
    const resetDataButton = document.getElementById('resetDataButton');
    const backToMenuFromGame = document.getElementById('backToMenuFromGame');

    // НОВЫЕ КОНСТАНТЫ ДЛЯ EXCEL
    const excelFileInput = document.getElementById('excelFileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    // --- Элементы DOM для модального окна добавления/редактирования ---
    const editQuestionText = document.getElementById('editQuestionText');
    const editAnswerText = document.getElementById('editAnswerText');
    const saveQuestionButton = document.getElementById('saveQuestionButton');
    const addEditQuestionsList = document.getElementById('addEditQuestionsList');

    // --- Элементы DOM для модального окна удаления ---
    const deleteQuestionsList = document.getElementById('deleteQuestionsList');

    // --- Элементы DOM для тренажера (игрового экрана) ---
    const body = document.body; // Для инверсии цветов
    const questionText = document.getElementById('questionText');
    const answerInput = document.getElementById('answerInput');
    const feedbackDiv = document.getElementById('feedback'); // Переименовал в feedbackDiv для ясности
    const nextButton = document.getElementById('nextButton');

    // Элементы DOM для музыки и звуков
    const menuMusic = document.getElementById('menuMusic');
    const gameMusic = document.getElementById('gameMusic');
    const errorSound = document.getElementById('errorSound');
    const successSound = document.getElementById('successSound');
    const coinSound = document.getElementById('coinSound');
    const streakCounter = document.getElementById('streakCounter');
    const totalQuestionsCount = document.getElementById('totalQuestionsCount');
    const answeredQuestionsCount = document.getElementById('answeredQuestionsCount');
    const correctlyAnsweredCount = document.getElementById('correctlyAnsweredCount');
    const withErrorsAnsweredCount = document.getElementById('withErrorsAnsweredCount');

    let programmingTerms = []; // Основной массив для хранения вопросов
    let currentTermIndex = 0;
    let correctAnswersInARow = 0;
    let hasErrorOccurredInCurrentAttempt = false;
    let inversionTimeout; // Для эффекта инверсии

    // --- Функции воспроизведения аудио с обработкой ошибок ---
    async function playSound(audioElement, resetPosition = false) { // Добавил параметр resetPosition
        if (audioElement) { // Проверяем, что элемент существует
            if (resetPosition) {
                audioElement.currentTime = 0; // Сбрасываем позицию для коротких звуков
            }
            try {
                await audioElement.play();
            } catch (error) {
                // Если ошибка связана с политикой автовоспроизведения, выводим предупреждение
                if (error.name === "NotAllowedError" || error.name === "AbortError") {
                    console.warn(`Автовоспроизведение аудио "${audioElement.id}" заблокировано. Пожалуйста, взаимодействуйте со страницей.`);
                } else {
                    console.error('Ошибка воспроизведения аудио:', error);
                }
            }
        }
    }

    async function stopSound(audioElement) {
        if (audioElement) { // Проверяем, что элемент существует
            audioElement.pause();
            audioElement.currentTime = 0; // Сброс на начало
        }
    }

    // --- Управление видимостью экранов/модальных окон ---
    function hideAllScreens() {
        // Скрываем основной контейнер, если он видимый, и все экраны внутри него
        mainContainer.classList.add('hidden'); // Скрываем основной контейнер
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        splashScreen.classList.add('hidden'); // Убедимся, что и заставка скрыта
    }

    function showMainMenu() {
        hideAllScreens();
        mainContainer.classList.remove('hidden'); // Показываем главный контейнер
        mainMenu.classList.remove('hidden');
        stopSound(gameMusic);
        // menuMusic уже может играть с заставкой, так что не вызываем playSound(menuMusic) здесь
        body.classList.remove('inverted-colors'); // Убираем инверсию при возвращении в меню
    }

    function showGameScreen() {
        if (programmingTerms.length === 0) {
            alert('Нет вопросов для тренировки! Добавьте вопросы через меню "Добавить/Изменить вопросы".');
            showAddEditModal(); // Перенаправляем в модалку добавления
            return;
        }
        hideAllScreens();
        mainContainer.classList.remove('hidden'); // Показываем главный контейнер
        gameScreen.classList.remove('hidden');
        stopSound(menuMusic); // Останавливаем фоновую музыку меню
        playSound(gameMusic, false); // Запускаем игровую музыку
        startGameMode(); // Передаем управление логике игры
    }

    function showAddEditModal() {
        hideAllScreens(); // Скрываем все, кроме модала
        mainContainer.classList.remove('hidden'); // Показываем главный контейнер под модалом
        addEditModal.classList.remove('hidden');
        clearAddEditForm();
        renderAddEditQuestions(); // Обновляем список при открытии
        stopSound(gameMusic);
        // menuMusic может быть уже запущена, если переход из меню, или нет
        // не запускаем ее здесь явно, showMainMenu() этим занимается
    }

    function showDeleteModal() {
        hideAllScreens(); // Скрываем все, кроме модала
        mainContainer.classList.remove('hidden'); // Показываем главный контейнер под модалом
        deleteModal.classList.remove('hidden');
        renderDeleteQuestions(); // Обновляем список при открытии
        stopSound(gameMusic);
        // menuMusic может быть уже запущена, если переход из меню, или нет
        // не запускаем ее здесь явно, showMainMenu() этим занимается
    }

    function hideModal(modalElement) {
        modalElement.classList.add('hidden');
        showMainMenu(); // Возвращаемся в главное меню после закрытия модалки
    }

    // --- LocalStorage Функции ---
    function saveProgrammingTerms() {
        localStorage.setItem('programmingTerms', JSON.stringify(programmingTerms));
    }

    function loadProgrammingTerms() {
        const storedTerms = localStorage.getItem('programmingTerms');
        if (storedTerms) {
            programmingTerms = JSON.parse(storedTerms);
            programmingTerms.forEach(q => {
                q.askedCount = q.askedCount || 0;
                q.correctAttempts = q.correctAttempts || 0;
                q.incorrectAttempts = q.incorrectAttempts || 0;
                q.lastAsked = q.lastAsked || 0;
            });
        } else {
            programmingTerms = [];
        }
        updateOverallCounters(); // Обновляем статистику при загрузке
    }

    // --- Функции рендеринга списков вопросов ---
    function renderAddEditQuestions() {
        addEditQuestionsList.innerHTML = '';
        if (programmingTerms.length === 0) {
            addEditQuestionsList.innerHTML = '<p style="text-align: center; color: #ff0000;">Вопросов пока нет. Добавьте первый!</p>';
            return;
        }
        programmingTerms.forEach((q, index) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            // Отображаем полный вопрос в data-full-question для модальных окон
            div.innerHTML = `
                <span data-full-question="${q.question}" data-full-answer="${q.answer}">${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}</span>
                <button class="edit-question-button" data-index="${index}">Изменить</button>
            `;
            addEditQuestionsList.appendChild(div);
        });
    }

    function renderDeleteQuestions() {
        deleteQuestionsList.innerHTML = '';
        if (programmingTerms.length === 0) {
            deleteQuestionsList.innerHTML = '<p style="text-align: center; color: #00ffff;">Вопросов пока нет.</p>';
            return;
        }
        programmingTerms.forEach((q, index) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <span>${q.question.substring(0, 70)}${q.question.length > 70 ? '...' : ''}</span>
                <button class="delete-button danger-button" data-index="${index}">Удалить</button>
            `;
            deleteQuestionsList.appendChild(div);
        });
    }

    function clearAddEditForm() {
        editQuestionText.value = '';
        editAnswerText.value = '';
        saveQuestionButton.dataset.editIndex = ''; // Сбрасываем индекс редактируемого вопроса
        saveQuestionButton.textContent = 'Добавить Вопрос';
    }

    // --- Логика тренажера ---
    function startGameMode() {
        correctAnswersInARow = 0; // Сброс серии в начале новой игры
        loadNewQuestion(); // Начинаем тренировку
    }

    function updateStreakCounter() {
        streakCounter.textContent = `Безошибочных ответов подряд: ${correctAnswersInARow}`;
    }

    function updateOverallCounters() {
        const totalQuestions = programmingTerms.length;
        // Подсчитываем только вопросы, по которым были попытки (хотя бы 1 askedCount)
        const answeredQuestions = programmingTerms.filter(term => term.askedCount > 0).length;
        const correctlyAnswered = programmingTerms.filter(term => term.correctAttempts > 0 && term.incorrectAttempts === 0).length;
        const withErrorsAnswered = programmingTerms.filter(term => term.incorrectAttempts > 0).length;

        totalQuestionsCount.textContent = totalQuestions;
        answeredQuestionsCount.textContent = answeredQuestions;
        correctlyAnsweredCount.textContent = correctlyAnswered;
        withErrorsAnsweredCount.textContent = withErrorsAnswered;
    }

    function chooseNextQuestionIndex() {
        const now = Date.now();
        const coolingPeriod = 5000; // 5 секунд "охлаждения" для только что заданного вопроса

        const availableQuestions = programmingTerms.filter((term) => {
            // Проверяем, если вопрос был задан недавно, он не доступен
            if (term.lastAsked && (now - term.lastAsked < coolingPeriod)) {
                return false;
            }
            // Если вопрос отвечен правильно и без ошибок, он меньше приоритетен
            if (term.correctAttempts > 0 && term.incorrectAttempts === 0) {
                return false;
            }
            return true;
        });

        if (availableQuestions.length === 0) {
            // Если все "доступные" вопросы закончились (либо все освоены, либо на кулдауне)
            // Возвращаем любой вопрос, который не освоен без ошибок
            const fallbackQuestions = programmingTerms.filter(term => !(term.correctAttempts > 0 && term.incorrectAttempts === 0));
            if (fallbackQuestions.length > 0) {
                 return programmingTerms.indexOf(fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)]);
            }
            return -1; // Все вопросы освоены
        }

        const questionsWithDifficulty = availableQuestions.map((term) => {
            let difficulty = 0;
            // Увеличиваем "сложность" для вопросов с ошибками
            difficulty += term.incorrectAttempts * 10;
            // Увеличиваем "сложность" для вопросов, на которые еще не отвечали правильно
            difficulty += (term.correctAttempts === 0 ? 5 : 0);
            // Немного увеличиваем для новых вопросов
            if (term.askedCount === 0) difficulty += 1;

            // Добавляем случайный фактор, чтобы не было слишком предсказуемо
            difficulty += Math.random() * 5;
            return { term, index: programmingTerms.indexOf(term), difficulty };
        });

        // Сортируем по убыванию сложности
        questionsWithDifficulty.sort((a, b) => b.difficulty - a.difficulty);

        // Выбираем из нескольких самых "сложных"
        const topDifficultQuestions = questionsWithDifficulty.slice(0, Math.min(questionsWithDifficulty.length, 5));
        if (topDifficultQuestions.length > 0) {
            const chosen = topDifficultQuestions[Math.floor(Math.random() * topDifficultQuestions.length)];
            return chosen.index;
        }

        // Если по какой-то причине все еще нет выбора, берем случайный
        return Math.floor(Math.random() * programmingTerms.length);
    }

    function fireConfetti() {
        const colors = ['#00ff00', '#00cc00', '#00bb00', '#00ffff', '#00ccff', '#00bbff'];
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6, x: 0.5 }, startVelocity: 30, scalar: 1.2, colors: colors });
        confetti({ particleCount: 50, spread: 60, origin: { x: 0.1, y: 0.8 }, startVelocity: 25, scalar: 1, colors: colors });
        confetti({ particleCount: 50, spread: 60, origin: { x: 0.9, y: 0.8 }, startVelocity: 25, scalar: 1, colors: colors });
    }

    function loadNewQuestion() {
        if (programmingTerms.length === 0) {
            questionText.textContent = "Вопросов нет. Добавьте их в меню.";
            answerInput.value = '';
            answerInput.disabled = true;
            nextButton.classList.add('hidden'); // Скрываем кнопку "Следующий вопрос"
            feedbackDiv.textContent = "";
            return;
        }

        currentTermIndex = chooseNextQuestionIndex();
        if (currentTermIndex === -1) {
            questionText.textContent = "Поздравляем! Вы освоили все вопросы! 🎉";
            answerInput.value = '';
            answerInput.disabled = true;
            nextButton.classList.add('hidden'); // Скрываем кнопку "Следующий вопрос"
            feedbackDiv.textContent = "";
            return;
        }

        const term = programmingTerms[currentTermIndex];
        term.askedCount++;
        term.lastAsked = Date.now(); // Обновляем время последнего показа

        questionText.textContent = term.question;
        answerInput.value = '';
        answerInput.disabled = false;
        answerInput.focus();
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback'; // Сброс классов фидбека
        nextButton.classList.add('hidden'); // Кнопка "Следующий вопрос" скрыта по умолчанию

        hasErrorOccurredInCurrentAttempt = false; // Сбрасываем флаг ошибки для нового вопроса
        body.classList.remove('inverted-colors'); // Убираем инверсию при загрузке нового вопроса
        if (inversionTimeout) {
            clearTimeout(inversionTimeout);
            inversionTimeout = null;
        }

        updateStreakCounter();
        updateOverallCounters();
    }

    // --- ФУНКЦИЯ handleInput() - проверяет ввод пользователя ---
    function handleInput() {
        const userInput = answerInput.value;
        if (!programmingTerms[currentTermIndex]) return; // Защита от отсутствия текущего вопроса

        const currentAnswer = programmingTerms[currentTermIndex].answer;
        const currentTerm = programmingTerms[currentTermIndex];

        const normalizedUserInput = userInput.replace(/\s+/g, ' ').trim().toLowerCase();
        const normalizedCurrentAnswer = currentAnswer.replace(/\s+/g, ' ').trim().toLowerCase();

        // Проверяем, начинается ли введенный текст с правильного ответа
        if (!normalizedCurrentAnswer.startsWith(normalizedUserInput)) {
            feedbackDiv.textContent = `Неверно. Правильно: ${currentAnswer}`;
            feedbackDiv.classList.remove('correct');
            feedbackDiv.classList.add('incorrect');
            playSound(errorSound, true); // Звук ошибки, сбрасывая позицию
            nextButton.classList.add('hidden'); // Если неверно, кнопка скрыта
            correctAnswersInARow = 0; // Сброс серии
            hasErrorOccurredInCurrentAttempt = true; // Устанавливаем флаг ошибки

            // Добавление вибрации при неправильном ответе
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]); // Паттерн вибрации
            }

            body.classList.add('inverted-colors'); // Включаем инверсию
            if (inversionTimeout) {
                clearTimeout(inversionTimeout);
            }
            inversionTimeout = setTimeout(() => {
                body.classList.remove('inverted-colors');
                inversionTimeout = null;
            }, 300); // Инверсия на 0.3 секунды

            updateStreakCounter();
        } else {
            // Если ввод ПОКА верный (начинается с правильного ответа)
            feedbackDiv.textContent = ''; // Очищаем фидбек
            feedbackDiv.classList.remove('incorrect'); // Убираем класс некорректного ответа

            // Воспроизводим звук монетки, если ввод частично верный, но еще не полный
            if (normalizedUserInput.length > 0 && normalizedUserInput !== normalizedCurrentAnswer) {
                playSound(coinSound, true); // Звук монетки, сбрасывая позицию
            }

            // Если введенный текст полностью совпадает с правильным ответом
            if (normalizedUserInput === normalizedCurrentAnswer) {
                feedbackDiv.textContent = 'Правильно!';
                feedbackDiv.classList.add('correct');
                playSound(successSound, true); // Звук успеха, сбрасывая позицию
                nextButton.classList.remove('hidden'); // Кнопка "Следующий вопрос" ПОКАЗЫВАЕТСЯ
                answerInput.disabled = true; // Блокируем поле ввода

                if (!hasErrorOccurredInCurrentAttempt) {
                    currentTerm.correctAttempts++;
                } else {
                    currentTerm.incorrectAttempts++;
                }

                correctAnswersInARow++;
                updateStreakCounter();
                updateOverallCounters(); // Обновляем статистику после правильного ответа

                fireConfetti(); // Запускаем конфетти
                body.classList.remove('inverted-colors'); // Убираем инверсию при правильном ответе
                if (inversionTimeout) {
                    clearTimeout(inversionTimeout);
                    inversionTimeout = null;
                }
                saveProgrammingTerms(); // Сохраняем прогресс
            } else {
                nextButton.classList.add('hidden'); // Если не полный ответ, кнопка скрыта
                answerInput.disabled = false; // Поле ввода активно
            }
        }
    }


    // --- Обработчики событий тренажера ---
    answerInput.addEventListener('input', handleInput);

    answerInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Предотвращаем стандартное поведение Enter (перенос строки)
            if (answerInput.disabled) { // Если поле заблокировано (ответ уже дан)
                nextButton.click(); // Имитируем нажатие кнопки "Следующий вопрос"
            } else {
                // Если поле не заблокировано, это значит, что Enter был нажат до полного ответа
                // В этом случае, если ответ правильный, он будет засчитан handleInput, иначе feedback будет "неверно"
                handleInput(); // Запускаем проверку еще раз, чтобы обновить фидбек и кнопку
            }
        }
    });

    nextButton.addEventListener('click', () => {
        loadNewQuestion();
    });

    // --- Обработчики кнопок меню и модальных окон ---
    startGameButton.addEventListener('click', showGameScreen);
    showAddEditModalButton.addEventListener('click', showAddEditModal);
    showDeleteModalButton.addEventListener('click', showDeleteModal);
    resetDataButton.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите сбросить все вопросы и статистику? Это действие необратимо.')) {
            localStorage.removeItem('programmingTerms');
            programmingTerms = [];
            loadProgrammingTerms(); // Загружаем пустой массив и обновляем статистику
            alert('Все данные сброшены!');
            renderAddEditQuestions();
            renderDeleteQuestions();
            showMainMenu();
        }
    });
    backToMenuFromGame.addEventListener('click', showMainMenu);

    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const modalId = event.target.dataset.modal;
            hideModal(document.getElementById(modalId));
        });
    });

    saveQuestionButton.addEventListener('click', () => {
        const question = editQuestionText.value.trim();
        const answer = editAnswerText.value.trim();
        const editIndex = saveQuestionButton.dataset.editIndex;

        if (question && answer) {
            const normalizedNewQuestion = question.replace(/\s+/g, ' ').trim().toLowerCase();
            const isDuplicate = programmingTerms.some((term, i) =>
                term.question.replace(/\s+/g, ' ').trim().toLowerCase() === normalizedNewQuestion &&
                (editIndex === '' || i !== parseInt(editIndex)) // Проверяем дубликат, исключая сам редактируемый вопрос
            );

            if (isDuplicate) {
                alert('Такой вопрос уже существует!');
                return;
            }

            if (editIndex !== '') {
                const index = parseInt(editIndex);
                programmingTerms[index].question = question;
                programmingTerms[index].answer = answer;
                // Сбрасываем статистику для измененного вопроса, чтобы он был переосвоен
                programmingTerms[index].askedCount = 0;
                programmingTerms[index].correctAttempts = 0;
                programmingTerms[index].incorrectAttempts = 0;
                programmingTerms[index].lastAsked = 0;
                alert('Вопрос успешно изменен!');
            } else {
                programmingTerms.push({
                    question: question,
                    answer: answer,
                    askedCount: 0, correctAttempts: 0, incorrectAttempts: 0, lastAsked: 0
                });
                alert('Вопрос успешно добавлен!');
            }
            saveProgrammingTerms();
            renderAddEditQuestions();
            renderDeleteQuestions(); // Обновляем список удаления
            clearAddEditForm();
            updateOverallCounters(); // Обновляем общее количество вопросов
        } else {
            alert('Пожалуйста, введите и вопрос, и ответ.');
        }
    });

    addEditQuestionsList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('edit-question-button')) {
            const index = parseInt(target.dataset.index);
            const q = programmingTerms[index];
            editQuestionText.value = q.question;
            editAnswerText.value = q.answer;
            saveQuestionButton.dataset.editIndex = index;
            saveQuestionButton.textContent = 'Сохранить Изменения';
        }
    });

    deleteQuestionsList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('delete-button')) {
            const index = parseInt(target.dataset.index);
            if (confirm(`Вы уверены, что хотите удалить вопрос "${programmingTerms[index].question.substring(0, 50)}${programmingTerms[index].question.length > 50 ? '...' : ''}"?`)) {
                programmingTerms.splice(index, 1);
                saveProgrammingTerms();
                renderDeleteQuestions();
                renderAddEditQuestions(); // Обновляем список и в модале добавления/редактирования
                updateOverallCounters(); // Обновляем общее количество вопросов
                alert('Вопрос удален.');
            }
        }
    });

    // --- БЛОК ДЛЯ ЗАГРУЗКИ EXCEL ---
    excelFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = `Выбран: ${file.name}`;
            readExcelFile(file);
        } else {
            fileNameDisplay.textContent = 'Файл не выбран';
        }
    });

    function readExcelFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const sheetName = workbook.SheetNames[0]; // Берем первый лист
            const worksheet = workbook.Sheets[sheetName];

            // Преобразуем лист в массив массивов, где каждая внутренняя запись - это строка
            const jsonSheet = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let newQuestions = [];
            let startRow = 0;
            // Проверяем, похожа ли первая строка на заголовки (регистр не важен, частичное совпадение)
            if (jsonSheet.length > 0 && Array.isArray(jsonSheet[0]) &&
                ((String(jsonSheet[0][0] || '').toLowerCase().includes("вопрос") || String(jsonSheet[0][0] || '').toLowerCase().includes("question")) &&
                 (String(jsonSheet[0][1] || '').toLowerCase().includes("ответ") || String(jsonSheet[0][1] || '').toLowerCase().includes("answer")))) {
                 startRow = 1; // Пропускаем строку с заголовками
            }

            for (let i = startRow; i < jsonSheet.length; i++) {
                const row = jsonSheet[i];
                // Убедимся, что строка существует и есть данные в первых двух столбцах (вопрос и ответ)
                // Также проверяем, что они не пустые после обрезки пробелов
                if (row && row[0] !== undefined && row[1] !== undefined && String(row[0]).trim() !== '' && String(row[1]).trim() !== '') {
                    const question = String(row[0]).trim();
                    const answer = String(row[1]).trim();
                    newQuestions.push({
                        question: question,
                        answer: answer,
                        askedCount: 0,
                        correctAttempts: 0,
                        incorrectAttempts: 0,
                        lastAsked: 0
                    });
                }
            }

            if (newQuestions.length > 0) {
                // Добавляем новые вопросы к существующим, избегая дубликатов по нормализованному вопросу.
                const currentQuestionsNormalizedSet = new Set(programmingTerms.map(q => q.question.replace(/\s+/g, ' ').trim().toLowerCase()));
                const uniqueNewQuestions = newQuestions.filter(nq => !currentQuestionsNormalizedSet.has(nq.question.replace(/\s+/g, ' ').trim().toLowerCase()));

                programmingTerms.push(...uniqueNewQuestions);
                saveProgrammingTerms();
                alert(`Успешно загружено ${uniqueNewQuestions.length} новых вопросов из файла "${file.name}"! (Пропущено ${newQuestions.length - uniqueNewQuestions.length} дубликатов)`);
                renderAddEditQuestions();
                renderDeleteQuestions();
                updateOverallCounters();
            } else {
                alert('Не найдено вопросов и ответов в файле Excel. Убедитесь, что вопросы в первом столбце, а ответы во втором.');
            }
            excelFileInput.value = '';
            fileNameDisplay.textContent = 'Файл не выбран';
        };

        reader.onerror = () => {
            alert('Не удалось прочитать файл.');
            excelFileInput.value = '';
            fileNameDisplay.textContent = 'Файл не выбран';
        };

        reader.readAsArrayBuffer(file);
    }
    // --- КОНЕЦ БЛОКА ДЛЯ ЗАГРУЗКИ EXCEL ---

    // --- НОВАЯ ЛОГИКА ДЛЯ ЗАСТАВКИ "МАТРИЦА" ---
    // Добавьте в index.html элементы #splashScreen и #matrixCanvas
    const matrixCanvas = document.createElement('canvas'); // Создаем элемент канваса
    matrixCanvas.id = 'matrixCanvas';
    splashScreen.appendChild(matrixCanvas); // Добавляем его в splashScreen

    const ctx = matrixCanvas.getContext('2d');

    // Установка размеров канваса
    function resizeMatrixCanvas() {
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
        // Пересчитать drops при изменении размера
        const newColumns = Math.floor(matrixCanvas.width / fontSize);
        const oldDrops = [...drops];
        drops.length = 0;
        for (let i = 0; i < newColumns; i++) {
            drops[i] = oldDrops[i] !== undefined ? oldDrops[i] : 1;
        }
    }

    // Символы для "матричного" дождя (русские, английские буквы и цифры)
    const characters = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    const charactersArray = characters.split('');

    const fontSize = 16;
    let drops = []; // Инициализируем здесь, чтобы resizeMatrixCanvas мог его использовать

    function drawMatrixRain() {
        ctx.fillStyle = 'rgba(13, 13, 13, 0.05)'; // Затемняем фон
        ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

        ctx.fillStyle = '#00ff00'; // Ярко-зеленый
        ctx.font = `${fontSize}px 'Press Start 2P'`;

        for (let i = 0; i < drops.length; i++) {
            const text = charactersArray[Math.floor(Math.random() * charactersArray.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    window.addEventListener('resize', resizeMatrixCanvas); // Обработчик изменения размера окна


    // Функция для запуска анимации заставки и перехода к основному меню
    function startIntroAnimation() {
        splashScreen.classList.remove('hidden'); // Показываем заставку
        mainContainer.classList.add('hidden'); // Убедимся, что основной контейнер скрыт

        playSound(menuMusic, false); // ЗАПУСКАЕМ МУЗЫКУ МЕНЮ С ЗАСТАВКОЙ

        resizeMatrixCanvas(); // Инициализация размеров канваса и drops
        let animationFrameId;
        const animate = () => {
            drawMatrixRain();
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        // Через 5 секунд скрываем заставку и показываем основное меню
        setTimeout(() => {
            cancelAnimationFrame(animationFrameId); // Останавливаем анимацию
            splashScreen.classList.add('hidden'); // Скрываем заставку
            showMainMenu(); // Показываем основное меню
        }, 5000); // Показываем заставку 5 секунд
    }

    // --- Инициализация при загрузке страницы ---
    loadProgrammingTerms(); // Загружаем вопросы и статистику при старте
    startIntroAnimation(); // Начинаем с заставки!
});
