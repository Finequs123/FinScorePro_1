// Emergency token cleanup script
console.log('Clearing expired authentication tokens...');
localStorage.removeItem('auth_token');
sessionStorage.clear();
console.log('Tokens cleared. Redirecting to login...');
window.location.href = '/login';