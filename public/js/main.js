// Fetch API
const Form = document.getElementById('SingIn');

Form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(Form);
    const data = Object.fromEntries(formData);

   const response = await fetch('/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    let responseData;
    try {
        responseData = await response.json();
    } catch (error) {
        console.error('Error parsing response:', error);
        alert('Error: Invalid response from server');
        return;
    }
    
    if (response.ok) {
        console.log(responseData);
        // Always redirect to admin dashboard since only admin login is supported
        window.location.href = '/admin/employee';
    } else {
        alert(responseData.message || 'Account Not Found');
        return;
    }
});