<?php
// filepath: /Users/m3055099280/Library/Mobile Documents/com~apple~CloudDocs/Sites/localhost/amplitude/modules/demo/reset.php

// Clear all cookies
if (isset($_SERVER['HTTP_COOKIE'])) {
    $cookies = explode('; ', $_SERVER['HTTP_COOKIE']);
    foreach ($cookies as $cookie) {
        $parts = explode('=', $cookie);
        $name = trim($parts[0]);
        setcookie($name, '', time() - 3600, '/'); // Expire the cookie
        setcookie($name, '', time() - 3600, '/', $_SERVER['HTTP_HOST']); // Expire the cookie for the domain
    }
}

// Output HTML to clear localStorage and sessionStorage and display the link
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset</title>
    <script>
        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
    </script>
</head>
<body>
    <h1>Reset Complete</h1>
    <p>All cookies, local storage, and session storage have been cleared.</p>
    <a href="modules.html">Go to Modules Page</a>
</body>
</html>