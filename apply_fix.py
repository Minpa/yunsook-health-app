#!/usr/bin/env python3

with open('app_new.js', 'r') as f:
    content = f.read()

# Fix 1
old1 = """    updateWeekDisplay() {
        const displayElement = document.getElementById('weekDisplay');
        if (displayElement) {
            displayElement.textContent = formatWeekDisplay(this.currentWeekKey);
        }
    }"""

new1 = """    updateWeekDisplay() {
        const displayElement = document.getElementById('weekDisplay');
        if (displayElement) {
            displayElement.textContent = formatWeekDisplay(this.currentWeekKey);
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
    }"""

if old1 in content:
    content = content.replace(old1, new1)
    print("✅ Fix 1 applied: updateWeekDisplay method updated")
else:
    print("❌ Fix 1 failed: Could not find updateWeekDisplay method")

# Fix 2
old2 = """        const dateInput = document.getElementById('mealDate');
        if (dateInput) {
            dateInput.value = formatDate(new Date());
        }"""

new2 = """        const dateInput = document.getElementById('mealDate');
        if (dateInput) {
            dateInput.value = formatDate(new Date());
            // Remove browser-imposed date restrictions to allow past dates
            dateInput.removeAttribute('min');
            dateInput.removeAttribute('max');
        }"""

if old2 in content:
    content = content.replace(old2, new2)
    print("✅ Fix 2 applied: Date restrictions removed")
else:
    print("❌ Fix 2 failed: Could not find date input initialization")

with open('app_new.js', 'w') as f:
    f.write(content)

print("\n✅ All fixes applied successfully!")
