// Test week key generation
function getWeekKey(date) {
    const d = new Date(date);
    const day = d.getDay();
    const daysToSubtract = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - daysToSubtract);
    monday.setHours(0, 0, 0, 0);
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
}

// Test with today (October 6, 2025 - Monday)
const today = new Date('2025-10-06');
console.log('Today:', today.toDateString());
console.log('Day of week:', today.getDay(), '(0=Sunday, 1=Monday)');
console.log('Week key for today:', getWeekKey(today));

// Test with Thursday (October 9, 2025)
const thursday = new Date('2025-10-09');
console.log('\nThursday:', thursday.toDateString());
console.log('Day of week:', thursday.getDay());
console.log('Week key for Thursday:', getWeekKey(thursday));

// They should be the same!
console.log('\nAre they the same week?', getWeekKey(today) === getWeekKey(thursday));
