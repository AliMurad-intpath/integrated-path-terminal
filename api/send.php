<?php
declare(strict_types=1);
use PHPMailer\PHPMailer\PHPMailer;
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function reply(int $status, string $code, array $extra = []): void {
    http_response_code($status);
    echo json_encode(array_merge(['ok' => $status === 200, 'code' => $code], $extra));
    exit;
}
$configPath = getenv('IP_SMTP_CONFIG') ?: dirname(__DIR__, 3) . '/ip-smtp-config.php';
if (!is_file($configPath)) reply(503, 'unconfigured');
$config = require $configPath;
if (!is_array($config) || empty($config['host']) || empty($config['from'])) reply(503, 'unconfigured');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = $config['origins'] ?? ['https://int-path.com', 'https://www.int-path.com'];
if ($origin && !in_array($origin, $allowed, true)) reply(403, 'origin');
if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') reply(403, 'origin');
session_start(['cookie_httponly' => true, 'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'cookie_samesite' => 'Strict']);
if (empty($_SESSION['form_token'])) $_SESSION['form_token'] = bin2hex(random_bytes(32));
if ($_SERVER['REQUEST_METHOD'] === 'GET') reply(200, 'ready', ['token' => $_SESSION['form_token']]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, 'method');
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 9 * 1024 * 1024) reply(413, 'attachment');
if (!is_string($_POST['token'] ?? null) || !hash_equals($_SESSION['form_token'], $_POST['token'])) reply(403, 'token');
if (!empty($_POST['website'])) reply(422, 'validation');
$kind = $_POST['kind'] ?? '';
if (!in_array($kind, ['enquiry', 'support', 'application'], true)) reply(422, 'validation');
$fields = [];
foreach (['name'=>120,'company'=>180,'email'=>254,'phone'=>60,'subject'=>160,'message'=>4000] as $key=>$limit) {
    if (!is_string($_POST[$key] ?? '')) reply(422, 'validation');
    $value = trim($_POST[$key] ?? '');
    if (strlen($value) > $limit * 4 || ($key !== 'message' && preg_match('/[\r\n\x00]/', $value))) reply(422, 'validation');
    $fields[$key] = $value;
}
foreach (['name','email','subject','message'] as $key) if ($fields[$key] === '') reply(422, 'validation');
if (!filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) reply(422, 'validation');
$attachment = null;
if (isset($_FILES['attachment']) && ($_FILES['attachment']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['attachment'];
    if (is_array($file['error']) || $file['error'] !== UPLOAD_ERR_OK || $file['size'] > 8 * 1024 * 1024 || !is_uploaded_file($file['tmp_name'])) reply(422, 'attachment');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $types = $kind === 'application' ? ['application/pdf'=>'pdf'] : ['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','video/mp4'=>'mp4'];
    if (!isset($types[$mime])) reply(422, 'attachment');
    $attachment = [$file['tmp_name'], ($kind === 'application' ? 'CV' : 'attachment') . '.' . $types[$mime]];
}
// Shared, locked per-IP counter prevents parallel requests bypassing the limit.
$ratePath = sys_get_temp_dir() . '/ip-form-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __DIR__) . '.json';
$lock = fopen($ratePath, 'c+');
if (!$lock || !flock($lock, LOCK_EX)) reply(503, 'unavailable');
$times = json_decode(stream_get_contents($lock), true) ?: [];
$times = array_values(array_filter($times, fn($t) => is_int($t) && $t > time() - 3600));
if (count($times) >= 5) { flock($lock, LOCK_UN); fclose($lock); reply(429, 'rate'); }
$times[] = time(); ftruncate($lock, 0); rewind($lock); fwrite($lock, json_encode($times)); fflush($lock); flock($lock, LOCK_UN); fclose($lock);
session_write_close();
require __DIR__ . '/../vendor/phpmailer/Exception.php';
require __DIR__ . '/../vendor/phpmailer/PHPMailer.php';
require __DIR__ . '/../vendor/phpmailer/SMTP.php';
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $config['host'];
    $mail->Port = (int)($config['port'] ?? 587);
    $mail->SMTPAuth = (bool)($config['auth'] ?? true);
    $mail->Username = $config['username'] ?? '';
    $mail->Password = $config['password'] ?? '';
    $mail->SMTPSecure = $config['encryption'] ?? 'tls';
    $mail->SMTPAutoTLS = ($config['encryption'] ?? 'tls') !== '';
    $mail->Timeout = 20;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($config['from'], 'Integrated Path Website');
    $mail->addAddress('info@int-path.com');
    $mail->addReplyTo($fields['email'], $fields['name']);
    $mail->Subject = '[' . ucfirst($kind) . '] ' . $fields['subject'];
    $mail->Body = 'Form: ' . $kind . "\n\n";
    foreach ($fields as $key=>$value) $mail->Body .= ucfirst($key) . ': ' . $value . "\n\n";
    if ($attachment) $mail->addAttachment($attachment[0], $attachment[1]);
    $mail->send();
    reply(200, 'accepted');
} catch (Throwable $error) {
    error_log('Integrated Path form: SMTP delivery failed.');
    reply(502, 'delivery');
}
