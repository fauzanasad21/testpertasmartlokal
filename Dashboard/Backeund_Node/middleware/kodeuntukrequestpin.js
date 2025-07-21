async function requestPin() {
    try {
        const response = await fetch('/auth/request-pin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message);
        } else {
            alert('Terjadi kesalahan: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal mengirim permintaan.');
    }
}
