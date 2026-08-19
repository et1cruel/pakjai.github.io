// Landing page interactive effects and accessibility enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Focus first input
    const activeInput = document.querySelector('.auth-form.active input');
    if (activeInput) {
        activeInput.focus();
    }
});
