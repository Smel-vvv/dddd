document.addEventListener('DOMContentLoaded', function() {
    // Инициализация приложения
    const app = {
        // Конфигурация
        config: {
            theme: localStorage.getItem('theme') || 'light',
            achievements: {
                'first_entry': { earned: false, title: 'Первая запись', desc: 'Создайте свою первую запись' },
                'five_entries': { earned: false, title: 'Пятерка', desc: 'Создайте 5 записей' },
                'week_streak': { earned: false, title: 'Неделя', desc: 'Ведите дневник 7 дней подряд' },
                'high_mood': { earned: false, title: 'Оптимист', desc: 'Оцените день на 5 звезд' }
            }
        },
        
        // Инициализация
        init() {
            this.setTheme();
            this.setupEventListeners();
            this.loadEntries();
            this.renderStats();
            this.renderCharts();
            this.checkAchievements();
            
            // Проверка PWA
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
            }
        },
        
        // Установка темы
        setTheme() {
            document.body.className = `${this.config.theme}-theme`;
            const icon = document.querySelector('#themeToggle i');
            icon.className = this.config.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        },
        
        // Загрузка записей
        loadEntries() {
            this.entries = JSON.parse(localStorage.getItem('diaryEntries')) || [];
            this.currentRating = 0;
            this.selectedTags = [];
        },
        
        // Сохранение записей
        saveEntries() {
            localStorage.setItem('diaryEntries', JSON.stringify(this.entries));
            this.renderStats();
            this.renderCharts();
            this.checkAchievements();
        },
        
        // Обработчики событий
        setupEventListeners() {
            // Переключение темы
            document.getElementById('themeToggle').addEventListener('click', () => {
                this.config.theme = this.config.theme === 'dark' ? 'light' : 'dark';
                localStorage.setItem('theme', this.config.theme);
                this.setTheme();
            });
            
            // Эмодзи рейтинг
            document.querySelectorAll('.emoji-option').forEach(emoji => {
                emoji.addEventListener('click', () => {
                    this.currentRating = parseInt(emoji.getAttribute('data-rating'));
                    document.querySelectorAll('.emoji-option').forEach(e => {
                        e.classList.toggle('selected', 
                            parseInt(e.getAttribute('data-rating')) === this.currentRating);
                    });
                });
            });
            
            // Выбор тегов
            document.querySelectorAll('.tag-checkbox input').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.selectedTags.push(e.target.value);
                    } else {
                        this.selectedTags = this.selectedTags.filter(tag => tag !== e.target.value);
                    }
                });
            });
            
            // Сохранение записи
            document.getElementById('saveEntry').addEventListener('click', () => this.saveEntry());
            
            // Форматирование текста
            document.querySelectorAll('.format-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const command = btn.getAttribute('data-command');
                    document.execCommand(command, false, null);
                });
            });
            
            // Добавление фото
            document.getElementById('addPhotoBtn').addEventListener('click', () => {
                document.getElementById('photoInput').click();
            });
            
            // Поиск и фильтрация
            document.getElementById('searchInput').addEventListener('input', () => this.renderEntries());
            document.getElementById('filterRating').addEventListener('change', () => this.renderEntries());
            document.getElementById('filterTag').addEventListener('change', () => this.renderEntries());
            document.getElementById('filterDate').addEventListener('change', () => this.renderEntries());
            
            // Экспорт/импорт
            document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
            document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importInput').click());
        },
        
        // Сохранение новой записи
        saveEntry() {
            const entryText = document.getElementById('entryEditor').innerHTML;
            const complaintsText = document.getElementById('complaintsEditor').innerHTML;
            
            if (!entryText && !complaintsText) {
                alert('Пожалуйста, добавьте запись или жалобу');
                return;
            }
            
            if (this.currentRating === 0) {
                alert('Пожалуйста, оцените свой день');
                return;
            }
            
            const now = new Date();
            const entry = {
                id: Date.now(),
                date: now.toISOString(),
                rating: this.currentRating,
                text: entryText,
                complaints: complaintsText,
                tags: [...this.selectedTags],
                photo: null // Будет добавлено при загрузке фото
            };
            
            // Обработка фото
            const photoInput = document.getElementById('photoInput');
            if (photoInput.files && photoInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    entry.photo = e.target.result;
                    this.addEntry(entry);
                };
                reader.readAsDataURL(photoInput.files[0]);
            } else {
                this.addEntry(entry);
            }
        },
        
        // Добавление записи в массив
        addEntry(entry) {
            this.entries.unshift(entry);
            this.saveEntries();
            this.resetForm();
            this.renderEntries();
        },
        
        // Рендер списка записей с фильтрацией
        renderEntries() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const ratingFilter = parseInt(document.getElementById('filterRating').value);
            const tagFilter = document.getElementById('filterTag').value;
            const dateFilter = document.getElementById('filterDate').value;
            
            const filteredEntries = this.entries.filter(entry => {
                const matchesSearch = searchTerm === '' || 
                    entry.text.toLowerCase().includes(searchTerm) || 
                    entry.complaints.toLowerCase().includes(searchTerm);
                
                const matchesRating = ratingFilter === 0 || entry.rating === ratingFilter;
                
                const matchesTag = tagFilter === '' || 
                    (entry.tags && entry.tags.includes(tagFilter));
                
                const matchesDate = dateFilter === '' || 
                    new Date(entry.date).toISOString().split('T')[0] === dateFilter;
                
                return matchesSearch && matchesRating && matchesTag && matchesDate;
            });
            
            const entriesList = document.getElementById('entriesList');
            entriesList.innerHTML = '';
            
            if (filteredEntries.length === 0) {
                entriesList.innerHTML = '<p>Записи не найдены</p>';
                return;
            }
            
            filteredEntries.forEach(entry => {
                const entryEl = this.createEntryElement(entry);
                entriesList.appendChild(entryEl);
            });
        },
        
        // Создание элемента записи
        createEntryElement(entry) {
            const entryDate = new Date(entry.date);
            const dateStr = entryDate.toLocaleDateString('ru-RU', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            
            const entryEl = document.createElement('div');
            entryEl.className = 'entry-card';
            
            let tagsHtml = '';
            if (entry.tags && entry.tags.length > 0) {
                tagsHtml = `<div class="entry-tags">${entry.tags.map(tag => 
                    `<span class="tag">${tag}</span>`).join('')}</div>`;
            }
            
            let photoHtml = '';
            if (entry.photo) {
                photoHtml = `<div class="entry-photo-preview">
                    <img src="${entry.photo}" alt="Фото записи">
                </div>`;
            }
            
            entryEl.innerHTML = `
                <div class="entry-header">
                    <div class="entry-date">${dateStr}</div>
                    <div class="entry-rating">${'★'.repeat(entry.rating)}${'☆'.repeat(5 - entry.rating)}</div>
                </div>
                ${tagsHtml}
                <div class="entry-preview">${entry.text || 'Нет описания дня'}</div>
                ${entry.complaints ? `<div class="entry-complaints">${entry.complaints}</div>` : ''}
                ${photoHtml}
            `;
            
            entryEl.addEventListener('click', () => this.openModal(entry.id));
            return entryEl;
        },
        
        // Отображение статистики
        renderStats() {
            if (this.entries.length === 0) {
                document.getElementById('avgRating').textContent = '0';
                document.getElementById('totalEntries').textContent = '0';
                document.getElementById('streakDays').textContent = '0';
                return;
            }
            
            // Средний рейтинг
            const avgRating = (this.entries.reduce((sum, entry) => sum + entry.rating, 0) / this.entries.length).toFixed(1);
            document.getElementById('avgRating').textContent = avgRating;
            
            // Всего записей
            document.getElementById('totalEntries').textContent = this.entries.length;
            
            // Серия дней
            let streak = 1;
            const sortedEntries = [...this.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            for (let i = 1; i < sortedEntries.length; i++) {
                const prevDate = new Date(sortedEntries[i-1].date);
                const currDate = new Date(sortedEntries[i].date);
                const diffTime = currDate - prevDate;
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                if (diffDays === 1) {
                    streak++;
                } else if (diffDays > 1) {
                    break;
                }
            }
            
            document.getElementById('streakDays').textContent = streak;
        },
        
        // Отображение графиков
        renderCharts() {
            // График настроения за последние 7 дней
            const last7Days = this.getLastNDays(7);
            const moodCtx = document.getElementById('moodChart').getContext('2d');
            
            if (this.moodChart) {
                this.moodChart.destroy();
            }
            
            this.moodChart = new Chart(moodCtx, {
                type: 'line',
                data: {
                    labels: last7Days.map(day => day.date),
                    datasets: [{
                        label: 'Настроение',
                        data: last7Days.map(day => day.avgRating),
                        borderColor: 'rgba(106, 90, 205, 1)',
                        backgroundColor: 'rgba(106, 90, 205, 0.2)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    scales: {
                        y: {
                            min: 0,
                            max: 5,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
            
            // График тегов
            const tagCounts = this.countTags();
            const tagsCtx = document.getElementById('tagsChart').getContext('2d');
            
            if (this.tagsChart) {
                this.tagsChart.destroy();
            }
            
            this.tagsChart = new Chart(tagsCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(tagCounts),
                    datasets: [{
                        data: Object.values(tagCounts),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(153, 102, 255, 0.7)'
                        ]
                    }]
                }
            });
        },
        
        // Получение данных за N дней
        getLastNDays(n) {
            const result = [];
            const today = new Date();
            
            for (let i = n-1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const dayEntries = this.entries.filter(entry => 
                    entry.date.startsWith(dateStr));
                
                const avgRating = dayEntries.length > 0 ? 
                    (dayEntries.reduce((sum, entry) => sum + entry.rating, 0) / dayEntries.length).toFixed(1) : 0;
                
                result.push({
                    date: date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }),
                    avgRating: avgRating
                });
            }
            
            return result;
        },
        
        // Подсчет тегов
        countTags() {
            const tagCounts = {};
            
            this.entries.forEach(entry => {
                if (entry.tags) {
                    entry.tags.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                }
            });
            
            return tagCounts;
        },
        
        // Проверка достижений
        checkAchievements() {
            // Первая запись
            if (this.entries.length >= 1 && !this.config.achievements.first_entry.earned) {
                this.earnAchievement('first_entry');
            }
            
            // 5 записей
            if (this.entries.length >= 5 && !this.config.achievements.five_entries.earned) {
                this.earnAchievement('five_entries');
            }
            
            // Высокий рейтинг
            const hasHighRating = this.entries.some(entry => entry.rating === 5);
            if (hasHighRating && !this.config.achievements.high_mood.earned) {
                this.earnAchievement('high_mood');
            }
            
            // Серия из 7 дней
            // (реализация аналогична renderStats)
        },
        
        // Получение достижения
        earnAchievement(achievementId) {
            this.config.achievements[achievementId].earned = true;
            this.showAchievementNotification(achievementId);
            this.updateAchievementBadge();
        },
        
        // Уведомление о достижении
        showAchievementNotification(achievementId) {
            const achievement = this.config.achievements[achievementId];
            const notification = document.createElement('div');
            notification.className = 'achievement-notification';
            notification.innerHTML = `
                <div class="achievement-icon">🏆</div>
                <div class="achievement-text">
                    <h3>${achievement.title}</h3>
                    <p>${achievement.desc}</p>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        notification.remove();
                    }, 500);
                }, 3000);
            }, 100);
        },
        
        // Обновление бейджа достижений
        updateAchievementBadge() {
            const earnedCount = Object.values(this.config.achievements).filter(a => a.earned).length;
            const badge = document.getElementById('achievementBadge');
            
            if (earnedCount > 0) {
                badge.textContent = earnedCount;
                badge.style.display = 'flex';
                badge.addEventListener('click', () => this.showAchievementsModal());
            } else {
                badge.style.display = 'none';
            }
        },
        
        // Экспорт данных
        exportData() {
            const data = {
                entries: this.entries,
                achievements: this.config.achievements
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `дневник_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        // Импорт данных
        importData(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.entries) {
                        this.entries = data.entries;
                        this.saveEntries();
                    }
                    
                    if (data.achievements) {
                        this.config.achievements = data.achievements;
                        this.updateAchievementBadge();
                    }
                    
                    alert('Данные успешно импортированы!');
                } catch (error) {
                    alert('Ошибка при импорте данных: ' + error.message);
                }
            };
            reader.readAsText(file);
        },
        
        // Сброс формы
        resetForm() {
            document.getElementById('entryEditor').innerHTML = '';
            document.getElementById('complaintsEditor').innerHTML = '';
            document.getElementById('photoInput').value = '';
            this.currentRating = 0;
            this.selectedTags = [];
            
            document.querySelectorAll('.emoji-option').forEach(e => {
                e.classList.remove('selected');
            });
            
            document.querySelectorAll('.tag-checkbox input').forEach(cb => {
                cb.checked = false;
            });
        }
    };
    
    // Запуск приложения
    app.init();
    
    // Обработчик импорта
    document.getElementById('importInput').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            app.importData(e.target.files[0]);
        }
    });
});