const express = require('express');
const app = require('');
const port = process.env.PORT || 5000

app.get('/', (req, res) => {
    res.send('Carpentryz is running')
})

app.listen(port, () => {
    console.log(`Carpentryz listening on port ${port}`)
})