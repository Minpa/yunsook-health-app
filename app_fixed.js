// Add this at the beginning of the WeekNavigator class updateWeekDisplay method

updateWeekDisplay() {
    const displayElement = document.getElementById('weekDisplay');
    if (displayElement) {
        displayElement.textContent = formatWeekDisplay(this.currentWeekKey);
    }
    
    // Ensure navigation buttons remain visible
    const prevBtn = document.getElementById('prevWeek');
    const nextBtn = document.getElementById('nextWeek');
    const copyBtn = document.getElementById('copyFromLastWeek');
    const reportLink = document.querySelector('.report-link');
    
    if (prevBtn) prevBtn.style.display = '';
    if (nextBtn) nextBtn.style.display = '';
    if (copyBtn) copyBtn.style.display = '';
    if (reportLink) reportLink.style.display = '';
    
    console.log('Week display updated, all buttons visible');
}
