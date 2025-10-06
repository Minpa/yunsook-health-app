// Utility Functions for Week Management
function getWeekKey(date) {
    const d = new Date(date);
    const day = d.getDay();
    // Calculate days to subtract to get to Monday
    // Sunday (0) -> subtract 6 days, Monday (1) -> 0, Tuesday (2) -> 1, etc.
    const daysToSubtract = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - daysToSubtract);
    monday.setHours(0, 0, 0, 0);
    // Use local date to avoid timezone issues
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
}

function getWeekRange(weekKey) {
    const monday = new Date(weekKey);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
        start: monday,
        end: sunday
    };
}

function formatWeekDisplay(weekKey) {
    const range = getWeekRange(weekKey);
    const start = formatDate(range.start);
    // Only show day for end date (not full date)
    const endDay = String(range.end.getDate()).padStart(2, '0');
    return `${start} ~ ${endDay}`;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getKoreanDayName(dayIndex) {
    const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
    return days[dayIndex];
}

function getShortKoreanDayName(dayIndex) {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return days[dayIndex];
}


// Storage Manager - handles localStorage operations
class StorageManager {
    constructor() {
        this.storageKey = 'healthApp_data';
        this.available = this.isLocalStorageAvailable();
        
        if (!this.available) {
            console.warn('localStorage is not available. Using in-memory storage.');
            this.memoryStorage = {};
        }
        
        console.log('StorageManager initialized');
    }
    
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    getDefaultData() {
        return {
            version: '1.0',
            masterExercises: [],
            weeklyExercises: {},
            healthData: {},
            weeklyHealth: {},
            metricDefinitions: [],
            meals: {}
        };
    }
    
    loadData() {
        try {
            if (!this.available) {
                return this.memoryStorage.data || this.getDefaultData();
            }
            
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) {
                return this.getDefaultData();
            }
            
            const data = JSON.parse(raw);
            
            // Validate data structure
            if (!data.version || !data.masterExercises) {
                console.warn('Invalid data structure, resetting to default');
                return this.getDefaultData();
            }
            
            return data;
        } catch (error) {
            console.error('Error loading data:', error);
            
            // Backup corrupted data
            if (this.available) {
                const raw = localStorage.getItem(this.storageKey);
                if (raw) {
                    localStorage.setItem(this.storageKey + '_backup', raw);
                    console.log('Corrupted data backed up');
                }
            }
            
            return this.getDefaultData();
        }
    }
    
    saveData(data) {
        try {
            if (!this.available) {
                this.memoryStorage.data = data;
                return true;
            }
            
            const json = JSON.stringify(data);
            localStorage.setItem(this.storageKey, json);
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            
            // Check if quota exceeded
            if (error.name === 'QuotaExceededError') {
                alert('저장 공간이 부족합니다. 일부 데이터를 삭제해주세요.');
            }
            
            return false;
        }
    }
    
    clearData() {
        if (this.available) {
            localStorage.removeItem(this.storageKey);
        } else {
            this.memoryStorage = {};
        }
    }
}

class WeekNavigator {
    constructor() {
        this.currentWeekKey = getWeekKey(new Date());
        console.log('WeekNavigator initialized with week:', this.currentWeekKey);
    }
    
    init() {
        // Set up event listeners for navigation buttons
        const prevBtn = document.getElementById('prevWeek');
        const nextBtn = document.getElementById('nextWeek');
        const copyBtn = document.getElementById('copyFromLastWeek');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPreviousWeek());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToNextWeek());
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyFromLastWeek());
        }
        
        // Display current week
        this.updateWeekDisplay();
        
        console.log('WeekNavigator init complete');
    }
    
    getCurrentWeek() {
        return {
            weekKey: this.currentWeekKey,
            ...getWeekRange(this.currentWeekKey)
        };
    }
    
    goToPreviousWeek() {
        const currentMonday = new Date(this.currentWeekKey);
        currentMonday.setDate(currentMonday.getDate() - 7);
        this.currentWeekKey = getWeekKey(currentMonday);
        this.updateWeekDisplay();
        this.onWeekChange();
    }
    
    goToNextWeek() {
        const currentMonday = new Date(this.currentWeekKey);
        currentMonday.setDate(currentMonday.getDate() + 7);
        this.currentWeekKey = getWeekKey(currentMonday);
        this.updateWeekDisplay();
        this.onWeekChange();
    }
    
    updateWeekDisplay() {
        const displayElement = document.getElementById('weekDisplay');
        if (displayElement) {
            displayElement.textContent = formatWeekDisplay(this.currentWeekKey);
            
            // Add indicator if this week has data
            const data = window.storageManager.loadData();
            const weekData = data.weeklyExercises[this.currentWeekKey];
            let hasExercises = false;
            
            if (weekData) {
                hasExercises = weekData.days.some(day => day.exercises.length > 0);
            }
            
            if (hasExercises) {
                displayElement.style.fontWeight = 'bold';
                displayElement.style.color = '#4A90E2';
            } else {
                displayElement.style.fontWeight = 'normal';
                displayElement.style.color = '#333';
            }
        }
        
        // Ensure all navigation elements remain visible
        const prevBtn = document.getElementById('prevWeek');
        const nextBtn = document.getElementById('nextWeek');
        const copyBtn = document.getElementById('copyFromLastWeek');
        const reportLink = document.querySelector('.report-link');
        
        if (prevBtn) prevBtn.style.display = 'inline-block';
        if (nextBtn) nextBtn.style.display = 'inline-block';
        if (copyBtn) copyBtn.style.display = 'inline-block';
        if (reportLink) reportLink.style.display = 'inline-block';
        
        console.log('Week display updated, all buttons visible');
    }
    
    onWeekChange() {
        // Notify other components that the week has changed
        console.log('Week changed to:', this.currentWeekKey);
        
        // Reload data for the new week
        if (window.exerciseManager) {
            window.exerciseManager.loadWeekData(this.currentWeekKey);
        }
        if (window.healthTracker) {
            window.healthTracker.loadWeekData(this.currentWeekKey);
        }
        if (window.mealManager) {
            window.mealManager.loadWeekData(this.currentWeekKey);
        }
        if (window.memoManager) {
            window.memoManager.loadWeekData(this.currentWeekKey);
        }
    }
    
    copyFromLastWeek() {
        if (!window.exerciseManager) return;
        
        // Get last week's key
        const currentMonday = new Date(this.currentWeekKey);
        currentMonday.setDate(currentMonday.getDate() - 7);
        const lastWeekKey = getWeekKey(currentMonday);
        
        const data = window.storageManager.loadData();
        
        // Check if last week has data
        if (!data.weeklyExercises[lastWeekKey]) {
            alert('지난 주에 운동 기록이 없습니다.');
            return;
        }
        
        // Check if current week already has data
        if (data.weeklyExercises[this.currentWeekKey] && 
            data.weeklyExercises[this.currentWeekKey].days.some(day => day.exercises.length > 0)) {
            if (!confirm('이번 주에 이미 운동이 있습니다. 덮어쓰시겠습니까?')) {
                return;
            }
        }
        
        // Copy last week's data to current week
        data.weeklyExercises[this.currentWeekKey] = JSON.parse(
            JSON.stringify(data.weeklyExercises[lastWeekKey])
        );
        
        // Reset completion status for new week
        data.weeklyExercises[this.currentWeekKey].days.forEach(day => {
            day.exercises.forEach(exercise => {
                exercise.completed = false;
            });
        });
        
        window.storageManager.saveData(data);
        window.exerciseManager.loadWeekData(this.currentWeekKey);
        
        alert('지난 주 운동을 복사했습니다!');
    }
}

class TabManager {
    constructor() {
        this.currentTab = 'exercise';
        console.log('TabManager initialized');
    }
    
    init() {
        // Get all tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // Show initial tab
        this.switchTab(this.currentTab);
        
        console.log('TabManager init complete');
    }
    
    switchTab(tabName) {
        // Update current tab
        this.currentTab = tabName;
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        // Refresh data for the active tab
        this.refreshTabData(tabName);
        
        console.log('Switched to tab:', tabName);
    }
    
    refreshTabData(tabName) {
        // Refresh UI for the current tab to show saved data
        switch(tabName) {
            case 'exercise':
                if (window.exerciseManager) {
                    window.exerciseManager.data = window.storageManager.loadData();
                    window.exerciseManager.renderMasterList();
                    window.exerciseManager.renderDayCards();
                }
                break;
            case 'health':
                if (window.healthTracker) {
                    window.healthTracker.data = window.storageManager.loadData();
                    window.healthTracker.renderHealthCards();
                }
                break;
            case 'meal':
                if (window.mealManager) {
                    window.mealManager.data = window.storageManager.loadData();
                    window.mealManager.renderMealList();
                }
                break;
            case 'memo':
                console.log('🔵 MEMO TAB REFRESH TRIGGERED');
                if (window.memoManager && window.weekNavigator) {
                    const currentWeek = window.weekNavigator.currentWeekKey;
                    console.log('🔵 Current week:', currentWeek);
                    console.log('🔵 MemoManager week:', window.memoManager.currentWeekKey);
                    
                    // If week keys don't match, sync them
                    if (window.memoManager.currentWeekKey !== currentWeek) {
                        console.log('🔵 Week mismatch, reloading data');
                        window.memoManager.currentWeekKey = currentWeek;
                        window.memoManager.loadWeekMemos().then(() => {
                            console.log('🔵 Data loaded, now rendering');
                            window.memoManager.renderMemoCards();
                        }).catch(err => {
                            console.error('🔴 Error loading memos:', err);
                        });
                    } else {
                        console.log('🔵 Week matches, just rendering existing data');
                        window.memoManager.renderMemoCards();
                    }
                } else {
                    console.error('🔴 memoManager or weekNavigator not found');
                }
                break;
        }
    }
    
    getCurrentTab() {
        return this.currentTab;
    }
}
class ExerciseManager {
    constructor() {
        this.data = window.storageManager.loadData();
        this.currentWeekKey = window.weekNavigator ? window.weekNavigator.currentWeekKey : getWeekKey(new Date());
        console.log('ExerciseManager initialized');
    }
    
    init() {
        this.setupEventListeners();
        this.renderMasterList();
        this.renderDayCards();
        this.setupDayNavigation();
        console.log('ExerciseManager init complete');
    }
    
    setupEventListeners() {
        const addBtn = document.getElementById('addExerciseBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAddExercise());
        }
        
        // Allow Enter key to add exercise
        const nameInput = document.getElementById('exerciseName');
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddExercise();
                }
            });
        }
    }
    

    
    setupDayNavigation() {
        const dayNavButtons = document.querySelectorAll('.day-nav-btn');
        dayNavButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const dayIndex = parseInt(btn.dataset.day);
                this.scrollToDay(dayIndex);
                
                // Update active state
                dayNavButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        console.log('Day navigation setup complete');
    }
    
    scrollToDay(dayIndex) {
        console.log('Scrolling to day:', dayIndex);
        const dayCard = document.getElementById(`dayCard${dayIndex}`);
        console.log('Day card found:', dayCard);
        if (dayCard) {
            // Smooth scroll to the day card with offset for header
            const yOffset = -100; // Offset for header
            const y = dayCard.getBoundingClientRect().top + window.pageYOffset + yOffset;
            
            window.scrollTo({
                top: y,
                behavior: 'smooth'
            });
            
            // Add a highlight effect
            dayCard.style.transition = 'all 0.3s';
            dayCard.style.transform = 'scale(1.02)';
            dayCard.style.boxShadow = '0 4px 16px rgba(74, 144, 226, 0.3)';
            
            setTimeout(() => {
                dayCard.style.transform = '';
                dayCard.style.boxShadow = '';
            }, 500);
            
            console.log('Scrolled to day:', dayIndex);
        }
    }
    
    updateDayNavigation() {
        const dayNavButtons = document.querySelectorAll('.day-nav-btn');
        const weekData = this.data.weeklyExercises[this.currentWeekKey];
        
        if (!weekData) return;
        
        dayNavButtons.forEach((btn, index) => {
            const dayData = weekData.days[index];
            if (dayData && dayData.exercises.length > 0) {
                btn.classList.add('has-exercises');
            } else {
                btn.classList.remove('has-exercises');
            }
        });
        
        console.log('Day navigation updated');
    }

        handleAddExercise() {
        const nameInput = document.getElementById('exerciseName');
        const durationSelect = document.getElementById('exerciseDuration');
        
        const name = nameInput.value.trim();
        const duration = parseInt(durationSelect.value);
        
        if (!name) {
            alert('운동 이름을 입력해주세요.');
            return;
        }
        
        this.addExercise(name, duration);
        
        // Clear input
        nameInput.value = '';
        nameInput.focus();
    }
    
    addExercise(name, defaultDuration) {
        const id = 'ex_' + Date.now();
        const exercise = {
            id,
            name,
            defaultDuration
        };
        
        this.data.masterExercises.push(exercise);
        this.saveData();
        this.renderMasterList();
        
        console.log('Added exercise:', exercise);
    }
    
    removeExercise(id) {
        this.data.masterExercises = this.data.masterExercises.filter(ex => ex.id !== id);
        this.saveData();
        this.renderMasterList();
        
        console.log('Removed exercise:', id);
    }
    
    getMasterList() {
        return this.data.masterExercises;
    }
    
    addToDay(dayIndex, exerciseId) {
        console.log('🔵 addToDay called:', { dayIndex, exerciseId, currentWeekKey: this.currentWeekKey });
        const exercise = this.data.masterExercises.find(ex => ex.id === exerciseId);
        if (!exercise) {
            console.log('❌ Exercise not found:', exerciseId);
            return;
        }
        console.log('✅ Found exercise:', exercise);
        
        // Initialize week data if needed
        if (!this.data.weeklyExercises[this.currentWeekKey]) {
            this.data.weeklyExercises[this.currentWeekKey] = {
                days: Array(7).fill(null).map(() => ({ exercises: [] }))
            };
        }
        
        const dayData = this.data.weeklyExercises[this.currentWeekKey].days[dayIndex];
        
        // Check if already exists
        if (dayData.exercises.some(ex => ex.id === exerciseId)) {
            console.log('⚠️ Exercise already exists in day', dayIndex, '- forcing re-render');
            console.log('Current exercises:', dayData.exercises);
            this.renderDayCard(dayIndex);  // Force re-render to show existing exercises
            return;
        }
        
        dayData.exercises.push({
            id: exerciseId,
            completed: false,
            duration: exercise.defaultDuration
        });
        
        console.log('✅ Pushed exercise to dayData:', dayData.exercises.length, 'exercises now');
        
        this.saveData();
        console.log('✅ Data saved');
        
        this.renderDayCard(dayIndex);
        console.log('✅ Rendered day card', dayIndex);
        
        console.log('Added exercise to day', dayIndex);
    }
    
    removeFromDay(dayIndex, exerciseId) {
        if (!this.data.weeklyExercises[this.currentWeekKey]) return;
        
        const dayData = this.data.weeklyExercises[this.currentWeekKey].days[dayIndex];
        dayData.exercises = dayData.exercises.filter(ex => ex.id !== exerciseId);
        
        this.saveData();
        this.renderDayCard(dayIndex);
        
        console.log('Removed exercise from day', dayIndex);
    }
    
    toggleComplete(dayIndex, exerciseId) {
        if (!this.data.weeklyExercises[this.currentWeekKey]) return;
        
        const dayData = this.data.weeklyExercises[this.currentWeekKey].days[dayIndex];
        const exercise = dayData.exercises.find(ex => ex.id === exerciseId);
        
        if (exercise) {
            exercise.completed = !exercise.completed;
            this.saveData();
            this.renderDayCard(dayIndex);
        }
    }
    
    updateDuration(dayIndex, exerciseId, duration) {
        if (!this.data.weeklyExercises[this.currentWeekKey]) return;
        
        const dayData = this.data.weeklyExercises[this.currentWeekKey].days[dayIndex];
        const exercise = dayData.exercises.find(ex => ex.id === exerciseId);
        
        if (exercise) {
            exercise.duration = duration;
            this.saveData();
            this.renderDayCard(dayIndex);
        }
    }
    
    saveData() {
        window.storageManager.saveData(this.data);
    }
    
    loadWeekData(weekKey) {
        this.currentWeekKey = weekKey;
        this.data = window.storageManager.loadData();  // Reload data from storage
        this.renderMasterList();
        this.renderDayCards();
        
        // Render exercises for all days in the new week
        console.log('Loading week data for:', weekKey);
        for (let i = 0; i < 7; i++) {
            this.renderDayExercises(i);
        }
        this.updateDayNavigation();
        console.log('Week data loaded and rendered');
    }
    
    renderMasterList() {
        const container = document.getElementById('masterExerciseList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.data.masterExercises.length === 0) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">운동을 추가해주세요.</p>';
            return;
        }
        
        this.data.masterExercises.forEach(exercise => {
            const item = document.createElement('div');
            item.className = 'master-exercise-item';
            item.innerHTML = `
                <span><strong>${exercise.name}</strong> (${exercise.defaultDuration}분)</span>
                <button class="btn-danger" data-id="${exercise.id}">삭제</button>
            `;
            
            const deleteBtn = item.querySelector('.btn-danger');
            deleteBtn.addEventListener('click', () => {
                if (confirm(`"${exercise.name}"을(를) 삭제하시겠습니까?`)) {
                    this.removeExercise(exercise.id);
                }
            });
            
            container.appendChild(item);
        });
    }
    
    renderDayCards() {
        const container = document.getElementById('dayCards');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Initialize week data if needed
        if (!this.data.weeklyExercises[this.currentWeekKey]) {
            this.data.weeklyExercises[this.currentWeekKey] = {
                days: Array(7).fill(null).map(() => ({ exercises: [] }))
            };
        }
        
        // Create 7 day cards (Mon-Sun)
        for (let i = 0; i < 7; i++) {
            const dayCard = this.createDayCard(i);
            container.appendChild(dayCard);
        }
    }
    
    createDayCard(dayIndex) {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.id = `dayCard${dayIndex}`;
        
        const weekRange = getWeekRange(this.currentWeekKey);
        const dayDate = new Date(weekRange.start);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        
        card.innerHTML = `
            <div class="day-card-header">
                <h3>${getKoreanDayName(dayIndex)} (${formatDate(dayDate)})</h3>
                <button class="btn-add-all" data-day="${dayIndex}">데일리 목록 전체 추가</button>
            </div>
            <div class="day-exercises" id="dayExercises${dayIndex}"></div>
            <div class="day-total" style="margin-top: 10px; font-weight: 600; color: #4A90E2;">
                총 시간: <span id="dayTotal${dayIndex}">0</span>분
            </div>
        `;
        
        const addAllBtn = card.querySelector('.btn-add-all');
        addAllBtn.addEventListener('click', () => {
            this.addAllToDay(dayIndex);
        });
        
        this.renderDayExercises(dayIndex);
        
        return card;
    }
    
    addAllToDay(dayIndex) {
        console.log('🟢 addAllToDay called for day:', dayIndex);
        console.log('Master exercises count:', this.data.masterExercises.length);
        
        if (this.data.masterExercises.length === 0) {
            alert('먼저 운동 목록을 추가해주세요.');
            return;
        }
        
        console.log('Adding all exercises to day', dayIndex);
        this.data.masterExercises.forEach(exercise => {
            console.log('  Adding:', exercise.name);
            this.addToDay(dayIndex, exercise.id);
        });
        console.log('✅ Finished adding all exercises to day', dayIndex);
    }
    
    renderDayCard(dayIndex) {
        this.renderDayExercises(dayIndex);
        this.updateDayNavigation();
    }
    
    renderDayExercises(dayIndex) {
        console.log('🎨 renderDayExercises called for day:', dayIndex);
        const container = document.getElementById(`dayExercises${dayIndex}`);
        if (!container) {
            console.log('❌ Container not found for day:', dayIndex);
            return;
        }
        
        container.innerHTML = '';
        
        const weekData = this.data.weeklyExercises[this.currentWeekKey];
        console.log('Week data:', weekData);
        if (!weekData || !weekData.days[dayIndex]) {
            console.log('❌ No week data or day data for:', dayIndex);
            return;
        }
        
        const dayData = weekData.days[dayIndex];
        console.log('Day data for day', dayIndex, ':', dayData);
        
        if (dayData.exercises.length === 0) {
            container.innerHTML = '<p style="color: #999; font-size: 14px; padding: 10px 0;">운동이 없습니다.</p>';
            this.updateDayTotal(dayIndex, 0);
            return;
        }
        
        let totalMinutes = 0;
        
        dayData.exercises.forEach(exercise => {
            const masterExercise = this.data.masterExercises.find(ex => ex.id === exercise.id);
            if (!masterExercise) return;
            
            totalMinutes += exercise.duration;
            
            const item = document.createElement('div');
            item.className = 'exercise-item' + (exercise.completed ? ' completed' : '');
            item.innerHTML = `
                <input type="checkbox" ${exercise.completed ? 'checked' : ''} data-day="${dayIndex}" data-id="${exercise.id}">
                <span class="exercise-name">${masterExercise.name}</span>
                <select class="select-field" data-day="${dayIndex}" data-id="${exercise.id}">
                    ${this.generateDurationOptions(exercise.duration)}
                </select>
                <button class="btn-danger" data-day="${dayIndex}" data-id="${exercise.id}">삭제</button>
            `;
            
            // Checkbox event
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                this.toggleComplete(dayIndex, exercise.id);
            });
            
            // Duration select event
            const select = item.querySelector('select');
            select.addEventListener('change', (e) => {
                this.updateDuration(dayIndex, exercise.id, parseInt(e.target.value));
            });
            
            // Delete button event
            const deleteBtn = item.querySelector('.btn-danger');
            deleteBtn.addEventListener('click', () => {
                this.removeFromDay(dayIndex, exercise.id);
            });
            
            container.appendChild(item);
        });
        
        this.updateDayTotal(dayIndex, totalMinutes);
    }
    
    generateDurationOptions(selectedDuration) {
        let options = '';
        for (let i = 10; i <= 180; i += 10) {
            const selected = i === selectedDuration ? 'selected' : '';
            options += `<option value="${i}" ${selected}>${i}분</option>`;
        }
        return options;
    }
    
    updateDayTotal(dayIndex, totalMinutes) {
        const totalElement = document.getElementById(`dayTotal${dayIndex}`);
        if (totalElement) {
            totalElement.textContent = totalMinutes;
        }
    }
}

class HealthTracker {
    constructor() {
        this.data = window.storageManager.loadData();
        this.currentWeekKey = window.weekNavigator ? window.weekNavigator.currentWeekKey : getWeekKey(new Date());
        console.log('HealthTracker initialized');
    }
    
    init() {
        this.setupDayNavigation();
        this.renderHealthCards();
        console.log('HealthTracker init complete');
    }
    
    setupDayNavigation() {
        const dayNavButtons = document.querySelectorAll('.health-day-nav');
        dayNavButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const dayIndex = parseInt(btn.dataset.day);
                this.scrollToDay(dayIndex);
                
                // Update active state
                dayNavButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        console.log('Health day navigation setup complete');
    }
    
    scrollToDay(dayIndex) {
        console.log('Scrolling to health day:', dayIndex);
        const dayCard = document.getElementById(`healthCard${dayIndex}`);
        if (dayCard) {
            dayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    loadWeekData(weekKey) {
        this.currentWeekKey = weekKey;
        this.data = window.storageManager.loadData();
        this.renderHealthCards();
    }
    
    renderHealthCards() {
        const container = document.getElementById('healthCards');
        if (!container) return;
        
        container.innerHTML = '';
        
        const weekRange = getWeekRange(this.currentWeekKey);
        
        for (let i = 0; i < 7; i++) {
            const card = this.createHealthCard(i, weekRange);
            container.appendChild(card);
        }
    }
    
    getPreviousDayData(dayIndex, weekRange) {
        if (dayIndex === 0) {
            const prevWeekDate = new Date(weekRange.start);
            prevWeekDate.setDate(prevWeekDate.getDate() - 7);
            const prevWeekKey = getWeekKey(prevWeekDate);
            const prevWeekData = this.data.weeklyHealth[prevWeekKey];
            if (prevWeekData && prevWeekData.days && prevWeekData.days[6]) {
                return prevWeekData.days[6];
            }
        } else {
            const weekData = this.data.weeklyHealth[this.currentWeekKey];
            if (weekData && weekData.days && weekData.days[dayIndex - 1]) {
                return weekData.days[dayIndex - 1];
            }
        }
        return null;
    }
    
    formatDifference(current, previous) {
        if (!current || !previous) return "";
        const diff = parseFloat(current) - parseFloat(previous);
        if (diff === 0) return "<span style=\"color: #999; font-size: 12px; margin-left: 8px;\">-</span>";
        const sign = diff > 0 ? "+" : "";
        const color = diff > 0 ? "#e74c3c" : "#27ae60";
        return `<span style="color: ${color}; font-size: 12px; margin-left: 8px; font-weight: 600;">${sign}${diff.toFixed(1)}</span>`;
    }


    createHealthCard(dayIndex, weekRange) {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.id = `healthCard${dayIndex}`;
        
        const dayDate = new Date(weekRange.start);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        const dateStr = formatDate(dayDate);
        
        // Get existing data for this day
        // Ensure weeklyHealth exists
        if (!this.data.weeklyHealth) {
            this.data.weeklyHealth = {};
        }
        const weekData = this.data.weeklyHealth[this.currentWeekKey] || { days: [] };
        const dayData = weekData.days[dayIndex] || { weight: '', metrics: {} };
        const prevDayData = this.getPreviousDayData(dayIndex, weekRange);
        
        card.innerHTML = `
            <div class="day-card-header">
                <h3>${getKoreanDayName(dayIndex)} (${dateStr})</h3>
            </div>
            <div class="health-input-section">
                <div class="metric-item">
                    <label>몸무게 (kg) ${this.formatDifference(dayData.weight, prevDayData?.weight)}</label>
                    <input type="number" 
                           id="weight${dayIndex}" 
                           value="${dayData.weight || ''}" 
                           step="0.1" 
                           placeholder="65.5" 
                           class="input-field"
                           onchange="healthTracker.saveWeight(${dayIndex}, this.value)">
                </div>
                <div class="metric-item">
                    <label>골격근량 (kg) ${this.formatDifference(dayData.metrics?.muscleMass, prevDayData?.metrics?.muscleMass)}</label>
                    <input type="number" 
                           id="muscleMass${dayIndex}" 
                           value="${dayData.metrics?.muscleMass || ''}" 
                           step="0.1" 
                           placeholder="30.0" 
                           class="input-field"
                           onchange="healthTracker.saveMetric(${dayIndex}, 'muscleMass', this.value)">
                </div>
                <div class="metric-item">
                    <label>체지방량 (kg) ${this.formatDifference(dayData.metrics?.bodyFat, prevDayData?.metrics?.bodyFat)}</label>
                    <input type="number" 
                           id="bodyFat${dayIndex}" 
                           value="${dayData.metrics?.bodyFat || ''}" 
                           step="0.1" 
                           placeholder="15.0" 
                           class="input-field"
                           onchange="healthTracker.saveMetric(${dayIndex}, 'bodyFat', this.value)">
                </div>
            </div>
        `;
        
        return card;
    }
    
    saveWeight(dayIndex, value) {
        const weight = parseFloat(value);
        if (isNaN(weight) || weight <= 0) return;
        
        if (!this.data.weeklyHealth[this.currentWeekKey]) {
            this.data.weeklyHealth[this.currentWeekKey] = { days: [] };
        }
        
        if (!this.data.weeklyHealth[this.currentWeekKey].days[dayIndex]) {
            this.data.weeklyHealth[this.currentWeekKey].days[dayIndex] = { weight: '', metrics: {} };
        }
        
        this.data.weeklyHealth[this.currentWeekKey].days[dayIndex].weight = weight;
        window.storageManager.saveData(this.data);
        console.log('Weight saved for day', dayIndex, ':', weight);
        this.renderHealthCards();
    }
    
    saveMetric(dayIndex, metricName, value) {
        const metricValue = parseFloat(value);
        if (isNaN(metricValue) || metricValue <= 0) return;
        
        if (!this.data.weeklyHealth[this.currentWeekKey]) {
            this.data.weeklyHealth[this.currentWeekKey] = { days: [] };
        }
        
        if (!this.data.weeklyHealth[this.currentWeekKey].days[dayIndex]) {
            this.data.weeklyHealth[this.currentWeekKey].days[dayIndex] = { weight: '', metrics: {} };
        }
        
        if (!this.data.weeklyHealth[this.currentWeekKey].days[dayIndex].metrics) {
            this.data.weeklyHealth[this.currentWeekKey].days[dayIndex].metrics = {};
        }
        
        this.data.weeklyHealth[this.currentWeekKey].days[dayIndex].metrics[metricName] = metricValue;
        window.storageManager.saveData(this.data);
        console.log('Metric saved for day', dayIndex, ':', metricName, '=', metricValue);
        this.renderHealthCards();
    }
}


class MealManager {
    constructor() {
        this.data = window.storageManager.loadData();
        this.currentWeekKey = window.weekNavigator ? window.weekNavigator.currentWeekKey : getWeekKey(new Date());
        this.currentPhoto = null;
        console.log('MealManager initialized');
    }
    
    init() {
        this.setupEventListeners();
        this.renderMealList();
        
        // Set today's date as default
        const dateInput = document.getElementById('mealDate');
        if (dateInput) {
            dateInput.value = formatDate(new Date());
            // Remove browser-imposed date restrictions to allow past dates
            dateInput.removeAttribute('min');
            dateInput.removeAttribute('max');
        }
        
        console.log('MealManager init complete');
    }
    
    setupEventListeners() {
        // Add meal button
        const addBtn = document.getElementById('addMealBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.handleAddMeal());
        }
        
        // Photo upload
        const photoInput = document.getElementById('mealPhoto');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
        
        // Auto-estimate calories when food text changes
        const foodInput = document.getElementById('mealFood');
        if (foodInput) {
            foodInput.addEventListener('input', (e) => {
                const estimated = this.estimateCalories(e.target.value, '');
                const caloriesInput = document.getElementById('mealCalories');
                if (caloriesInput && estimated > 0) {
                    caloriesInput.value = estimated;
                    caloriesInput.placeholder = `자동 추정: ${estimated} kcal`;
                }
            });
        }
    }
    
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
        
        if (file.size > maxSize) {
            alert('사진 크기는 5MB 이하여야 합니다.');
            event.target.value = '';
            return;
        }
        
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            alert('JPG, PNG, HEIC 형식만 지원됩니다.');
            event.target.value = '';
            return;
        }
        
        // Convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentPhoto = e.target.result;
            console.log('Photo loaded');
            
            // Try to estimate calories from filename
            const foodInput = document.getElementById('mealFood');
            if (foodInput) {
                const estimated = this.estimateCalories(foodInput.value, file.name);
                const caloriesInput = document.getElementById('mealCalories');
                if (caloriesInput && estimated > 0) {
                    caloriesInput.value = estimated;
                }
            }
        };
        reader.readAsDataURL(file);
    }
    
    handleAddMeal() {
        const dateInput = document.getElementById('mealDate');
        const typeSelect = document.getElementById('mealType');
        const foodInput = document.getElementById('mealFood');
        const caloriesInput = document.getElementById('mealCalories');
        
        const date = dateInput.value;
        const mealType = typeSelect.value;
        const food = foodInput.value.trim();
        const calories = parseInt(caloriesInput.value) || 0;
        
        if (!date) {
            alert('날짜를 선택해주세요.');
            return;
        }
        
        if (!food) {
            alert('음식을 입력해주세요.');
            return;
        }
        
        this.addMeal(date, mealType, food, this.currentPhoto, calories);
        
        // Clear form
        foodInput.value = '';
        caloriesInput.value = '';
        caloriesInput.placeholder = '칼로리 (자동 추정)';
        document.getElementById('mealPhoto').value = '';
        this.currentPhoto = null;
        
        foodInput.focus();
    }
    
    addMeal(date, mealType, food, photo, calories) {
        const id = 'meal_' + Date.now();
        const weekKey = getWeekKey(new Date(date));
        
        if (!this.data.meals[weekKey]) {
            this.data.meals[weekKey] = [];
        }
        
        const meal = {
            id,
            date,
            mealType,
            food,
            photo: photo || null,
            calories,
            autoEstimated: calories > 0
        };
        
        this.data.meals[weekKey].push(meal);
        this.saveData();
        
        // Refresh if it's current week
        if (weekKey === this.currentWeekKey) {
            this.renderMealList();
        }
        
        console.log('Added meal:', meal);
    }
    
    removeMeal(mealId) {
        Object.keys(this.data.meals).forEach(weekKey => {
            this.data.meals[weekKey] = this.data.meals[weekKey].filter(m => m.id !== mealId);
        });
        
        this.saveData();
        this.renderMealList();
        
        console.log('Removed meal:', mealId);
    }
    
    updateCalories(mealId, calories) {
        Object.keys(this.data.meals).forEach(weekKey => {
            const meal = this.data.meals[weekKey].find(m => m.id === mealId);
            if (meal) {
                meal.calories = calories;
                meal.autoEstimated = false;
            }
        });
        
        this.saveData();
        console.log('Updated calories for meal:', mealId);
    }
    
    getMealsForWeek(weekKey) {
        return this.data.meals[weekKey] || [];
    }
    
    estimateCalories(foodText, photoName) {
        // Keyword-based calorie estimation
        const CALORIE_KEYWORDS = {
            '밥': 300,
            '쌀밥': 300,
            '현미밥': 280,
            '라면': 500,
            '샐러드': 150,
            '치킨': 800,
            '피자': 700,
            '김치찌개': 200,
            '된장찌개': 180,
            '계란': 80,
            '달걀': 80,
            '빵': 250,
            '식빵': 200,
            '우유': 130,
            '커피': 5,
            '아메리카노': 5,
            '라떼': 150,
            '과일': 100,
            '사과': 95,
            '바나나': 105,
            '고기': 400,
            '삼겹살': 500,
            '소고기': 450,
            '닭고기': 350,
            '생선': 200,
            '두부': 150,
            '김치': 30,
            '나물': 50,
            '국': 100,
            '찌개': 200,
            '탕': 250,
            '면': 400,
            '파스타': 450,
            '햄버거': 600,
            '샌드위치': 350,
            '김밥': 400,
            '떡볶이': 450,
            '순대': 350,
            '튀김': 300,
            '과자': 200,
            '초콜릿': 250,
            '아이스크림': 200,
            '케이크': 350,
            '요거트': 100,
            '치즈': 100
        };
        
        const text = (foodText + ' ' + photoName).toLowerCase();
        let total = 0;
        let matches = 0;
        
        for (const [keyword, cal] of Object.entries(CALORIE_KEYWORDS)) {
            if (text.includes(keyword)) {
                total += cal;
                matches++;
            }
        }
        
        return matches > 0 ? Math.round(total / matches) : 0;
    }
    
    saveData() {
        window.storageManager.saveData(this.data);
    }
    
    loadWeekData(weekKey) {
        this.currentWeekKey = weekKey;
        this.data = window.storageManager.loadData();  // Reload data from storage
        this.renderMealList();
    }
    
    renderMealList() {
        const container = document.getElementById('mealList');
        if (!container) return;
        
        container.innerHTML = '';
        
        const meals = this.getMealsForWeek(this.currentWeekKey);
        
        if (meals.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">식단 기록이 없습니다.</p>';
            return;
        }
        
        // Sort by date and meal type
        const sortedMeals = meals.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            const order = { '아침': 1, '점심': 2, '저녁': 3, '간식': 4 };
            return order[a.mealType] - order[b.mealType];
        });
        
        sortedMeals.forEach(meal => {
            const item = document.createElement('div');
            item.className = 'meal-item';
            
            const photoHtml = meal.photo 
                ? `<img src="${meal.photo}" class="meal-photo" alt="식사 사진">`
                : '';
            
            item.innerHTML = `
                <div class="meal-item-header">
                    <span class="meal-item-info">${meal.date} - ${meal.mealType}</span>
                    <button class="btn-danger" data-id="${meal.id}">삭제</button>
                </div>
                <div class="meal-item-details">
                    <div><strong>음식:</strong> ${meal.food}</div>
                    <div><strong>칼로리:</strong> ${meal.calories} kcal ${meal.autoEstimated ? '(자동 추정)' : ''}</div>
                </div>
                ${photoHtml}
            `;
            
            const deleteBtn = item.querySelector('.btn-danger');
            deleteBtn.addEventListener('click', () => {
                if (confirm('이 식단 기록을 삭제하시겠습니까?')) {
                    this.removeMeal(meal.id);
                }
            });
            
            container.appendChild(item);
        });
    }
}

class ReportGenerator {
    constructor() {
        this.data = window.storageManager.loadData();
        console.log('ReportGenerator initialized');
    }
    
    generateWeeklyReport(weekKey) {
        const weekRange = getWeekRange(weekKey);
        
        // Exercise stats
        const exerciseStats = this.calculateExerciseStats(weekKey);
        
        // Nutrition stats
        const nutritionStats = this.calculateNutritionStats(weekKey);
        
        // Health stats
        const healthStats = this.calculateHealthStats(weekKey);
        
        return {
            weekRange,
            exerciseStats,
            nutritionStats,
            healthStats
        };
    }
    
    calculateExerciseStats(weekKey) {
        const weekData = this.data.weeklyExercises[weekKey];
        
        if (!weekData) {
            return {
                completionRate: 0,
                totalMinutes: 0,
                completedCount: 0,
                totalCount: 0
            };
        }
        
        let totalCount = 0;
        let completedCount = 0;
        let totalMinutes = 0;
        
        weekData.days.forEach(day => {
            day.exercises.forEach(exercise => {
                totalCount++;
                if (exercise.completed) {
                    completedCount++;
                    totalMinutes += exercise.duration;
                }
            });
        });
        
        const completionRate = totalCount > 0 
            ? Math.round((completedCount / totalCount) * 100) 
            : 0;
        
        return {
            completionRate,
            totalMinutes,
            completedCount,
            totalCount
        };
    }
    
    calculateNutritionStats(weekKey) {
        const meals = this.data.meals[weekKey] || [];
        
        let totalCalories = 0;
        meals.forEach(meal => {
            totalCalories += meal.calories;
        });
        
        const avgDailyCalories = meals.length > 0 
            ? Math.round(totalCalories / 7) 
            : 0;
        
        return {
            totalCalories,
            avgDailyCalories,
            mealCount: meals.length
        };
    }
    
    calculateHealthStats(weekKey) {
        const weekRange = getWeekRange(weekKey);
        
        // Get start weight (Monday)
        const startWeekKey = weekKey;
        const startWeight = this.data.healthData[startWeekKey]?.weight || null;
        
        // Get end weight (Sunday - next week's Monday minus 1 day, or use same week)
        const endDate = new Date(weekRange.end);
        const endWeekKey = getWeekKey(endDate);
        const endWeight = this.data.healthData[endWeekKey]?.weight || startWeight;
        
        const weightChange = (startWeight && endWeight) 
            ? (endWeight - startWeight).toFixed(1) 
            : null;
        
        const customMetrics = this.data.healthData[weekKey]?.customMetrics || {};
        
        return {
            startWeight,
            endWeight,
            weightChange,
            customMetrics
        };
    }
    
    displayReport() {
        // Get previous week
        const today = new Date();
        const lastWeekDate = new Date(today);
        lastWeekDate.setDate(today.getDate() - 7);
        const previousWeekKey = getWeekKey(lastWeekDate);
        
        const report = this.generateWeeklyReport(previousWeekKey);
        
        // Display week range
        const weekRangeElement = document.getElementById('reportWeekRange');
        if (weekRangeElement) {
            weekRangeElement.textContent = `지난 주 요약 (${formatWeekDisplay(previousWeekKey)})`;
        }
        
        // Check if there's any data
        const hasData = report.exerciseStats.totalCount > 0 || 
                       report.nutritionStats.mealCount > 0 || 
                       report.healthStats.startWeight !== null;
        
        if (!hasData) {
            const noDataMsg = document.getElementById('noDataMessage');
            if (noDataMsg) {
                noDataMsg.style.display = 'block';
            }
            return;
        }
        
        // Display exercise stats
        this.displayElement('completionRate', `${report.exerciseStats.completionRate}%`);
        this.displayElement('totalMinutes', `${report.exerciseStats.totalMinutes}분`);
        this.displayElement('completedCount', `${report.exerciseStats.completedCount}개`);
        this.displayElement('totalCount', `${report.exerciseStats.totalCount}개`);
        
        // Display nutrition stats
        this.displayElement('totalCalories', `${report.nutritionStats.totalCalories} kcal`);
        this.displayElement('avgCalories', `${report.nutritionStats.avgDailyCalories} kcal`);
        this.displayElement('mealCount', `${report.nutritionStats.mealCount}끼`);
        
        // Display health stats
        this.displayElement('startWeight', report.healthStats.startWeight ? `${report.healthStats.startWeight} kg` : '-');
        this.displayElement('endWeight', report.healthStats.endWeight ? `${report.healthStats.endWeight} kg` : '-');
        
        if (report.healthStats.weightChange !== null) {
            const change = parseFloat(report.healthStats.weightChange);
            const changeText = change > 0 ? `+${change} kg` : `${change} kg`;
            const changeColor = change > 0 ? '#D0021B' : change < 0 ? '#7ED321' : '#666';
            this.displayElement('weightChange', changeText, changeColor);
        } else {
            this.displayElement('weightChange', '-');
        }
        
        // Display custom metrics
        this.displayCustomMetrics(report.healthStats.customMetrics);
        
        console.log('Report displayed for week:', previousWeekKey);
    }
    
    displayElement(id, value, color = null) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            if (color) {
                element.style.color = color;
            }
        }
    }
    
    displayCustomMetrics(metrics) {
        const container = document.getElementById('customMetricsReport');
        if (!container) return;
        
        container.innerHTML = '';
        
        const metricKeys = Object.keys(metrics);
        if (metricKeys.length === 0) {
            container.innerHTML = '<p style="color: #999;">커스텀 지표 기록이 없습니다.</p>';
            return;
        }
        
        container.innerHTML = '<h4 style="margin-bottom: 10px;">커스텀 지표</h4>';
        
        metricKeys.forEach(key => {
            const item = document.createElement('div');
            item.style.padding = '8px 0';
            item.style.borderBottom = '1px solid #E0E0E0';
            item.innerHTML = `<strong>${key}:</strong> ${metrics[key]}`;
            container.appendChild(item);
        });
    }
}

// Memo Manager
class MemoManager {
    constructor() {
        this.currentWeekKey = getWeekKey(new Date());
        this.memos = {};
    }

    async init() {
        await this.loadWeekMemos();
        this.setupDayNavigation();
        // Don't render yet - container might not exist if tab isn't active
        // Will render when tab is switched to
        console.log('MemoManager init complete - data loaded, will render when tab is opened');
    }
    
    setupDayNavigation() {
        const dayNavButtons = document.querySelectorAll('.memo-day-nav');
        dayNavButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const dayIndex = parseInt(btn.dataset.day);
                this.scrollToDay(dayIndex);
                
                // Update active state
                dayNavButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        console.log('Memo day navigation setup complete');
    }
    
    scrollToDay(dayIndex) {
        console.log('Scrolling to memo day:', dayIndex);
        const dayCard = document.getElementById(`memoCard${dayIndex}`);
        if (dayCard) {
            dayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.log('Memo card not found for day:', dayIndex);
        }
    }

    async loadWeekMemos() {
        // Session-based auth - no token needed

        const weekRange = getWeekRange(this.currentWeekKey);
        const startDate = formatDate(weekRange.start);
        const endDate = formatDate(weekRange.end);

        try {
            const response = await fetch(`/api/memos?startDate=${startDate}&endDate=${endDate}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📝 Loaded memos from server:', data.memos);
                this.memos = {};
                data.memos.forEach(memo => {
                    // Normalize date format to YYYY-MM-DD
                    const dateStr = memo.date.split('T')[0]; // Handle ISO format
                    if (!this.memos[dateStr]) {
                        this.memos[dateStr] = [];
                    }
                    this.memos[dateStr].push({
                        id: memo.id,
                        text: memo.text,
                        timestamp: memo.created_at
                    });
                });
                console.log('📝 Memos organized by date:', this.memos);
            }
        } catch (error) {
            console.error('Failed to load memos:', error);
        }
    }

    renderMemoCards() {
        const container = document.getElementById('memoCards');
        if (!container) {
            console.log('⚠️ Memo container not found, will render when tab is opened');
            return;
        }

        console.log('📝 Rendering memo cards for week:', this.currentWeekKey);
        console.log('📝 With memo data:', this.memos);
        
        // Force clear everything
        container.innerHTML = '';
        
        // Get the current week range
        const weekRange = getWeekRange(this.currentWeekKey);
        console.log('📝 Week range:', formatDate(weekRange.start), 'to', formatDate(weekRange.end));

        for (let i = 0; i < 7; i++) {
            const card = this.createMemoCard(i);
            container.appendChild(card);
        }

        // Now render the memo lists after all cards are in the DOM
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekRange.start);
            dayDate.setDate(dayDate.getDate() + i);
            const dateStr = formatDate(dayDate);
            this.renderMemoList(i, dateStr);
        }
    }

    createMemoCard(dayIndex) {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.id = `memoCard${dayIndex}`;

        const weekRange = getWeekRange(this.currentWeekKey);
        const dayDate = new Date(weekRange.start);
        dayDate.setDate(dayDate.getDate() + dayIndex);

        const dateStr = formatDate(dayDate);

        card.innerHTML = `
            <div class="day-card-header">
                <h3>${getKoreanDayName(dayIndex)} (${dateStr})</h3>
            </div>
            <div class="memo-add-section">
                <input type="text" id="memoInput${dayIndex}" placeholder="메모 입력..." class="input-field" data-date="${dateStr}">
                <button class="btn-primary" onclick="memoManager.addMemo(${dayIndex}, '${dateStr}')">추가</button>
            </div>
            <div class="memo-list" id="memoList${dayIndex}"></div>
        `;

        setTimeout(() => {
            const input = document.getElementById(`memoInput${dayIndex}`);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addMemo(dayIndex, dateStr);
                    }
                });
            }
        }, 0);

        // Don't render list here - will render after card is added to DOM
        return card;
    }

    getMemoForDay(dateStr) {
        return this.memos[dateStr] || [];
    }

    async addMemo(dayIndex, dateStr) {
        const input = document.getElementById(`memoInput${dayIndex}`);
        const memoText = input.value.trim();

        if (!memoText) {
            alert('메모를 입력해주세요!');
            return;
        }

        // Session-based auth - no token needed

        try {
            const response = await fetch('/api/memos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'credentials': 'include'
                },
                body: JSON.stringify({ date: dateStr, text: memoText })
            });

            if (response.ok) {
                const data = await response.json();
                
                if (!this.memos[dateStr]) {
                    this.memos[dateStr] = [];
                }
                
                this.memos[dateStr].push({
                    id: data.memo.id,
                    text: data.memo.text,
                    timestamp: data.memo.created_at
                });

                input.value = '';
                this.renderMemoList(dayIndex, dateStr);
            } else {
                alert('메모 저장 실패');
            }
        } catch (error) {
            console.error('Add memo error:', error);
            alert('메모 저장 중 오류가 발생했습니다');
        }
    }

    async deleteMemo(dayIndex, dateStr, memoId) {
        // Session-based auth - no token needed

        try {
            const response = await fetch(`/api/memos/${memoId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                if (this.memos[dateStr]) {
                    this.memos[dateStr] = this.memos[dateStr].filter(m => m.id !== memoId);
                    if (this.memos[dateStr].length === 0) {
                        delete this.memos[dateStr];
                    }
                }
                this.renderMemoList(dayIndex, dateStr);
            } else {
                alert('메모 삭제 실패');
            }
        } catch (error) {
            console.error('Delete memo error:', error);
            alert('메모 삭제 중 오류가 발생했습니다');
        }
    }

    renderMemoList(dayIndex, dateStr) {
        const container = document.getElementById(`memoList${dayIndex}`);
        if (!container) return;

        const memos = this.getMemoForDay(dateStr);
        console.log(`📝 Rendering memos for ${dateStr}:`, memos);

        if (memos.length === 0) {
            container.innerHTML = '<p style="color: #999; font-size: 14px; padding: 10px 0;">메모가 없습니다.</p>';
            return;
        }

        container.innerHTML = '';

        memos.forEach(memo => {
            const memoItem = document.createElement('div');
            memoItem.className = 'memo-item';
            memoItem.innerHTML = `
                <div class="memo-text">${memo.text}</div>
                <button class="btn-danger" onclick="memoManager.deleteMemo(${dayIndex}, '${dateStr}', ${memo.id})">삭제</button>
            `;
            container.appendChild(memoItem);
        });
    }

    async loadWeekData(weekKey) {
        this.currentWeekKey = weekKey;
        console.log('📝 Loading week data for:', weekKey);
        await this.loadWeekMemos();
        
        // If memo tab is currently active, render immediately
        if (window.tabManager && window.tabManager.currentTab === 'memo') {
            console.log('📝 Memo tab is active, rendering immediately');
            this.renderMemoCards();
        } else {
            console.log('📝 Week data loaded, will render when tab is opened');
        }
    }

    async onWeekChange(weekKey) {
        this.currentWeekKey = weekKey || getWeekKey(new Date());
        await this.loadWeekMemos();
        this.renderMemoCards();
    }
}



// ============================================
// INITIALIZATION
// ============================================

// Initialize all managers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing app...');
    
    // Create storage manager first
    window.storageManager = new StorageManager();
    
    // Create all manager instances
    window.weekNavigator = new WeekNavigator();
    window.tabManager = new TabManager();
    window.exerciseManager = new ExerciseManager();
    window.healthTracker = new HealthTracker();
    window.mealManager = new MealManager();
    window.memoManager = new MemoManager();
    window.reportGenerator = new ReportGenerator();
    
    // Initialize all managers (this attaches their event listeners)
    window.weekNavigator.init();
    window.tabManager.init();
    window.exerciseManager.init();
    window.healthTracker.init();
    window.mealManager.init();
    window.memoManager.init();
    
    // Attach tab button click listeners
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            console.log('🔵 Tab button clicked:', tabName);
            window.tabManager.switchTab(tabName);
        });
    });
    
    console.log('✅ App initialized successfully');
});
