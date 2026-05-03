<?php
/**
 * Plugin Name: KYDEX Notary Dashboard
 * Plugin URI: https://kydex.me
 * Description: Secure logged-in KYDEX screening dashboard for individual notary WordPress sites. Supports manual screening, ID/image screening through KYDEX OCR, audit lookup, and KYDEX/OFAC status tools.
 * Version: 1.0.1
 * Author: KYDEX
 * License: Proprietary
 * Text Domain: kydex-notary-dashboard
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Kydex_Notary_Dashboard {
    const VERSION = '1.0.1';
    const OPTION = 'kydex_notary_dashboard_settings';
    const NONCE = 'kydex_notary_dashboard_nonce';
    const API_CLIENT = 'wordpress-notary-plugin';
    const LOCAL_DEV_API_BASE_URL = 'http://localhost:4000/api/v1';
    const PRODUCTION_API_BASE_URL = 'https://kydex.me/api/v1';
    const LOCAL_DEV_NOTARY_API_KEY = 'dev_sandranassif_key';

    public function __construct() {
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_enqueue_scripts', [$this, 'assets']);

        add_shortcode('kydex_notary_dashboard', [$this, 'dashboard_shortcode']);

        add_action('wp_ajax_kydex_manual_screen', [$this, 'ajax_manual_screen']);
        add_action('wp_ajax_kydex_image_screen', [$this, 'ajax_image_screen']);
        add_action('wp_ajax_kydex_audit_lookup', [$this, 'ajax_audit_lookup']);
        add_action('wp_ajax_kydex_connection_test', [$this, 'ajax_connection_test']);
        add_action('wp_ajax_kydex_ofac_health', [$this, 'ajax_ofac_health']);
        add_action('wp_ajax_kydex_ofac_lists', [$this, 'ajax_ofac_lists']);
        add_action('wp_ajax_kydex_ofac_programs', [$this, 'ajax_ofac_programs']);
        add_action('wp_ajax_kydex_sync_status', [$this, 'ajax_sync_status']);
    }

    public static function activate() {
        $defaults = self::defaults();
        $existing = get_option(self::OPTION, []);
        update_option(self::OPTION, wp_parse_args($existing, $defaults), false);
    }

    public static function defaults() {
        return [
            'api_base_url' => self::LOCAL_DEV_API_BASE_URL,
            'production_api_base_url' => self::PRODUCTION_API_BASE_URL,
            'use_production' => '0',
            'notary_slug' => 'sandranassif',
            'notary_api_key' => '',
            'wordpress_site_origin' => '',
            'required_capability' => 'read',
            'max_upload_mb' => '8',
            'request_timeout' => '45',
            'enable_image_screening' => '1',
            'enable_audit_lookup' => '1',
            'enable_admin_status_tools' => '1',
        ];
    }

    private function settings() {
        return wp_parse_args(get_option(self::OPTION, []), self::defaults());
    }

    private function api_base() {
        $s = $this->settings();

        $base = $s['use_production'] === '1'
            ? $s['production_api_base_url']
            : $s['api_base_url'];

        return rtrim($base, '/');
    }

    private function api_key() {
        $s = $this->settings();
        return trim($s['notary_api_key']);
    }

    private function wordpress_site_header() {
        $s = $this->settings();
        $origin = isset($s['wordpress_site_origin']) ? trim((string) $s['wordpress_site_origin']) : '';

        if ($origin !== '') {
            return untrailingslashit($origin);
        }

        return untrailingslashit(home_url());
    }

    private function is_production_enabled() {
        $s = $this->settings();
        return isset($s['use_production']) && $s['use_production'] === '1';
    }

    private function notary_slug() {
        $s = $this->settings();
        return sanitize_title($s['notary_slug']);
    }

    private function allowed() {
        if (!is_user_logged_in()) {
            return false;
        }

        $s = $this->settings();
        $cap = sanitize_key($s['required_capability'] ?: 'read');

        return current_user_can($cap);
    }

    public function admin_menu() {
        add_options_page(
            'KYDEX Notary Dashboard',
            'KYDEX Notary',
            'manage_options',
            'kydex-notary-dashboard',
            [$this, 'settings_page']
        );
    }

    public function register_settings() {
        register_setting('kydex_notary_dashboard_group', self::OPTION, [
            'sanitize_callback' => [$this, 'sanitize_settings'],
        ]);
    }

    public function sanitize_settings($input) {
        return [
            'api_base_url' => esc_url_raw($input['api_base_url'] ?? ''),
            'production_api_base_url' => esc_url_raw($input['production_api_base_url'] ?? ''),
            'use_production' => !empty($input['use_production']) ? '1' : '0',
            'notary_slug' => sanitize_title($input['notary_slug'] ?? 'sandranassif'),
            'notary_api_key' => sanitize_text_field($input['notary_api_key'] ?? ''),
            'wordpress_site_origin' => esc_url_raw($input['wordpress_site_origin'] ?? ''),
            'required_capability' => sanitize_key($input['required_capability'] ?? 'read'),
            'max_upload_mb' => (string) max(1, min(20, intval($input['max_upload_mb'] ?? 8))),
            'request_timeout' => (string) max(10, min(120, intval($input['request_timeout'] ?? 45))),
            'enable_image_screening' => !empty($input['enable_image_screening']) ? '1' : '0',
            'enable_audit_lookup' => !empty($input['enable_audit_lookup']) ? '1' : '0',
            'enable_admin_status_tools' => !empty($input['enable_admin_status_tools']) ? '1' : '0',
        ];
    }

    public function settings_page() {
        $s = $this->settings();
        ?>
        <div class="wrap">
            <h1>KYDEX Notary Dashboard</h1>
            <p>This plugin connects this WordPress notary website to KYDEX. WordPress never calls OFAC directly.</p>

            <form method="post" action="options.php">
                <?php settings_fields('kydex_notary_dashboard_group'); ?>

                <table class="form-table">
                    <tr>
                        <th>Local KYDEX API Base URL</th>
                        <td><input class="regular-text" name="<?php echo self::OPTION; ?>[api_base_url]" value="<?php echo esc_attr($s['api_base_url']); ?>"></td>
                    </tr>

                    <tr>
                        <th>Production KYDEX API Base URL</th>
                        <td><input class="regular-text" name="<?php echo self::OPTION; ?>[production_api_base_url]" value="<?php echo esc_attr($s['production_api_base_url']); ?>"></td>
                    </tr>

                    <tr>
                        <th>Use Production</th>
                        <td><input type="checkbox" name="<?php echo self::OPTION; ?>[use_production]" value="1" <?php checked($s['use_production'], '1'); ?>></td>
                    </tr>

                    <tr>
                        <th>Notary Slug</th>
                        <td><input class="regular-text" name="<?php echo self::OPTION; ?>[notary_slug]" value="<?php echo esc_attr($s['notary_slug']); ?>"></td>
                    </tr>

                    <tr>
                        <th>KYDEX Notary API Key</th>
                        <td>
                            <input type="password" class="regular-text" name="<?php echo self::OPTION; ?>[notary_api_key]" value="<?php echo esc_attr($s['notary_api_key']); ?>" autocomplete="off">
                            <p class="description">Stored server-side only. Never exposed to frontend JavaScript.</p>
                            <p class="description">For local Sandra setup, use: <code><?php echo esc_html( self::LOCAL_DEV_NOTARY_API_KEY ); ?></code></p>
                            <p class="description">For production Sandra setup, use the generated live key from KYDEX server/secrets manager.</p>
                        </td>
                    </tr>

                    <tr>
                        <th>WordPress Site Origin Header (optional)</th>
                        <td>
                            <input class="regular-text" name="<?php echo self::OPTION; ?>[wordpress_site_origin]" value="<?php echo esc_attr($s['wordpress_site_origin']); ?>" placeholder="https://your-wordpress-domain">
                            <p class="description">Used for <code>x-kydex-wordpress-site</code>. Leave empty to use current site URL automatically.</p>
                        </td>
                    </tr>

                    <tr>
                        <th>Local API Reference</th>
                        <td>
                            <code><?php echo esc_html( self::LOCAL_DEV_API_BASE_URL ); ?></code>
                            <p class="description">If you receive HTML 404 pages, your base URL is likely pointing to frontend instead of KYDEX API.</p>
                        </td>
                    </tr>

                    <tr>
                        <th>Required Capability</th>
                        <td><input class="regular-text" name="<?php echo self::OPTION; ?>[required_capability]" value="<?php echo esc_attr($s['required_capability']); ?>"></td>
                    </tr>

                    <tr>
                        <th>Max Upload MB</th>
                        <td><input type="number" min="1" max="20" name="<?php echo self::OPTION; ?>[max_upload_mb]" value="<?php echo esc_attr($s['max_upload_mb']); ?>"></td>
                    </tr>

                    <tr>
                        <th>Request Timeout</th>
                        <td><input type="number" min="10" max="120" name="<?php echo self::OPTION; ?>[request_timeout]" value="<?php echo esc_attr($s['request_timeout']); ?>"></td>
                    </tr>

                    <tr>
                        <th>Features</th>
                        <td>
                            <label><input type="checkbox" name="<?php echo self::OPTION; ?>[enable_image_screening]" value="1" <?php checked($s['enable_image_screening'], '1'); ?>> Enable ID/image screening</label><br>
                            <label><input type="checkbox" name="<?php echo self::OPTION; ?>[enable_audit_lookup]" value="1" <?php checked($s['enable_audit_lookup'], '1'); ?>> Enable audit lookup</label><br>
                            <label><input type="checkbox" name="<?php echo self::OPTION; ?>[enable_admin_status_tools]" value="1" <?php checked($s['enable_admin_status_tools'], '1'); ?>> Enable admin-only KYDEX/OFAC status tools</label>
                        </td>
                    </tr>
                </table>

                <?php submit_button(); ?>
            </form>

            <hr>
            <h2>Shortcode</h2>
            <code>[kydex_notary_dashboard]</code>
        </div>
        <?php
    }

    public function assets() {
        if (!is_singular()) {
            return;
        }

        $post = get_post();
        if (!$post || !has_shortcode((string) $post->post_content, 'kydex_notary_dashboard')) {
            return;
        }

        if (!$this->allowed()) {
            return;
        }

        wp_enqueue_style(
            'kydex-notary-dashboard',
            plugin_dir_url(__FILE__) . 'assets/css/kydex-dashboard.css',
            [],
            self::VERSION
        );

        wp_enqueue_script(
            'kydex-notary-dashboard',
            plugin_dir_url(__FILE__) . 'assets/js/kydex-dashboard.js',
            [],
            self::VERSION,
            true
        );

        $s = $this->settings();

        wp_localize_script('kydex-notary-dashboard', 'KYDEX_NOTARY_DASHBOARD', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce(self::NONCE),
            'maxUploadMb' => intval($s['max_upload_mb']),
        ]);
    }

    public function dashboard_shortcode() {
        $s = $this->settings();

        if (!$this->allowed()) {
            return '<div class="kydex-dashboard kydex-dashboard-locked"><h2>KYDEX Screening Dashboard</h2><p>Please log in with an authorized account.</p></div>';
        }

        ob_start();
        ?>
        <section class="kydex-dashboard">
            <div class="kydex-hero">
                <div>
                    <p class="kydex-kicker">KYDEX Notary Client</p>
                    <h1>Screening Dashboard</h1>
                    <p>Manual screening, ID/image scan, audit lookup, and KYDEX/OFAC status through a secure KYDEX connection.</p>
                </div>
                <div class="kydex-hero-badge">
                    <span>Notary</span>
                    <strong><?php echo esc_html($s['notary_slug']); ?></strong>
                </div>
            </div>

            <nav class="kydex-tabs">
                <button type="button" class="active" data-kydex-tab="manual">Manual Screening</button>

                <?php if ($s['enable_image_screening'] === '1'): ?>
                    <button type="button" data-kydex-tab="image">ID / Image Scan</button>
                <?php endif; ?>

                <?php if ($s['enable_audit_lookup'] === '1'): ?>
                    <button type="button" data-kydex-tab="audit">Audit Lookup</button>
                <?php endif; ?>

                <?php if ($s['enable_admin_status_tools'] === '1' && current_user_can('manage_options')): ?>
                    <button type="button" data-kydex-tab="status">KYDEX Status</button>
                <?php endif; ?>
            </nav>

            <div class="kydex-panel active" data-kydex-panel="manual">
                <form class="kydex-card" id="kydex-manual-form">
                    <h2>Manual screening</h2>

                    <label>Full name
                        <input name="query" required autocomplete="off" placeholder="Example: Mohammad Ahmad">
                    </label>

                    <label>Date of birth
                        <input name="dateOfBirth" type="date">
                    </label>

                    <label>Nationality
                        <input name="nationality" autocomplete="off" placeholder="Optional">
                    </label>

                    <label>Client/reference number
                        <input name="clientReference" autocomplete="off" placeholder="Optional">
                    </label>

                    <button type="submit">Run KYDEX Screening</button>
                </form>

                <div class="kydex-card kydex-result" id="kydex-manual-result">
                    <p>Submit a name to screen through KYDEX.</p>
                </div>
            </div>

            <?php if ($s['enable_image_screening'] === '1'): ?>
                <div class="kydex-panel" data-kydex-panel="image">
                    <form class="kydex-card" id="kydex-image-form" enctype="multipart/form-data">
                        <h2>ID / image scan</h2>

                        <label>Upload ID/image/PDF
                            <input name="image" type="file" accept="image/*,.pdf" capture="environment" required>
                        </label>

                        <label>Name override
                            <input name="queryOverride" autocomplete="off" placeholder="Use if OCR is unclear">
                        </label>

                        <label>Client/reference number
                            <input name="clientReference" autocomplete="off" placeholder="Optional">
                        </label>

                        <button type="submit">Scan and Screen</button>
                    </form>

                    <div class="kydex-card kydex-result" id="kydex-image-result">
                        <p>KYDEX will perform OCR, extract readable identity data, and screen the result.</p>
                    </div>
                </div>
            <?php endif; ?>

            <?php if ($s['enable_audit_lookup'] === '1'): ?>
                <div class="kydex-panel" data-kydex-panel="audit">
                    <form class="kydex-card" id="kydex-audit-form">
                        <h2>Audit lookup</h2>

                        <label>Audit ID
                            <input name="auditId" required autocomplete="off" placeholder="screening_search_id">
                        </label>

                        <button type="submit">Lookup Audit</button>
                    </form>

                    <div class="kydex-card kydex-result" id="kydex-audit-result">
                        <p>Use an audit ID returned by KYDEX to retrieve the screening record.</p>
                    </div>
                </div>
            <?php endif; ?>

            <?php if ($s['enable_admin_status_tools'] === '1' && current_user_can('manage_options')): ?>
                <div class="kydex-panel" data-kydex-panel="status">
                    <div class="kydex-card">
                        <h2>KYDEX / OFAC status</h2>
                        <div class="kydex-action-row">
                            <button type="button" data-kydex-action="kydex_connection_test">KYDEX Connection</button>
                            <button type="button" data-kydex-action="kydex_ofac_health">OFAC Health</button>
                            <button type="button" data-kydex-action="kydex_ofac_lists">OFAC Lists</button>
                            <button type="button" data-kydex-action="kydex_ofac_programs">OFAC Programs</button>
                            <button type="button" data-kydex-action="kydex_sync_status">Sync Status</button>
                        </div>
                    </div>

                    <div class="kydex-card kydex-result" id="kydex-status-result">
                        <p>Admin-only KYDEX and OFAC status tools.</p>
                    </div>
                </div>
            <?php endif; ?>

            <div class="kydex-disclaimer">
                KYDEX screening results are decision-support outputs. They require professional review before any legal, compliance, or notarial decision.
            </div>
        </section>
        <?php
        return ob_get_clean();
    }

    private function verify_ajax() {
        check_ajax_referer(self::NONCE, 'nonce');

        if (!$this->allowed()) {
            wp_send_json_error(['message' => 'Unauthorized. Please log in with an allowed account.'], 403);
        }

        if (!$this->api_key()) {
            wp_send_json_error(['message' => 'KYDEX API key is missing in WordPress settings.'], 500);
        }

        if ($this->is_production_enabled() && strpos($this->api_key(), 'dev_') === 0) {
            wp_send_json_error(['message' => 'Production mode is enabled but API key is a dev key. Use a live Sandra key generated on KYDEX server.'], 500);
        }

        if ($this->is_production_enabled() && $this->api_base() !== self::PRODUCTION_API_BASE_URL) {
            wp_send_json_error(['message' => 'Production mode requires API base URL to be ' . self::PRODUCTION_API_BASE_URL . '.'], 500);
        }
    }

    private function kydex_request($method, $path, $body = null) {
        $url = $this->api_base() . '/' . ltrim($path, '/');

        $args = [
            'method' => strtoupper($method),
            'timeout' => intval($this->settings()['request_timeout']),
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'x-kydex-notary-key' => $this->api_key(),
                'x-kydex-client' => self::API_CLIENT,
                'x-kydex-plugin-version' => self::VERSION,
                'x-kydex-wordpress-site' => $this->wordpress_site_header(),
            ],
        ];

        if ($body !== null) {
            $args['body'] = wp_json_encode($body);
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            wp_send_json_error(['message' => $response->get_error_message()], 500);
        }

        $code = wp_remote_retrieve_response_code($response);
        $raw = wp_remote_retrieve_body($response);
        $contentType = (string) wp_remote_retrieve_header($response, 'content-type');

        $looksLikeHtml = false;
        if (stripos($contentType, 'text/html') !== false) {
            $looksLikeHtml = true;
        } elseif (is_string($raw) && preg_match('/^\s*<(?:!DOCTYPE|html)\b/i', $raw)) {
            $looksLikeHtml = true;
        }

        if ($looksLikeHtml) {
            wp_send_json_error([
                'message' => 'Received HTML response instead of API JSON. Verify API Base URL points to KYDEX API backend, e.g. local: ' . self::LOCAL_DEV_API_BASE_URL . ' or production: ' . self::PRODUCTION_API_BASE_URL,
                'apiBase' => $this->api_base(),
                'requestedPath' => '/' . ltrim($path, '/'),
            ], 502);
        }

        $data = json_decode($raw, true);

        if ($code >= 200 && $code < 300) {
            wp_send_json_success($data);
        }

        wp_send_json_error($data ?: ['raw' => $raw], $code);
    }

    private function kydex_image_request($path) {
        if (!function_exists('curl_file_create')) {
            wp_send_json_error(['message' => 'PHP cURL is required for image screening.'], 500);
        }

        // Accept 'file' (current form field name) or 'image' (legacy fallback)
        $fileFieldName = !empty($_FILES['file']) && is_array($_FILES['file']) ? 'file' : 'image';

        if (empty($_FILES[$fileFieldName]) || !is_array($_FILES[$fileFieldName])) {
            wp_send_json_error(['message' => 'No image uploaded.'], 400);
        }

        $file = $_FILES[$fileFieldName];

        if (!isset($file['error']) || (int) $file['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error(['message' => 'File upload failed.'], 400);
        }

        if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            wp_send_json_error(['message' => 'Invalid uploaded file.'], 400);
        }

        $s = $this->settings();
        $max = intval($s['max_upload_mb']) * 1024 * 1024;

        if (!isset($file['size']) || (int) $file['size'] > $max) {
            wp_send_json_error(['message' => 'File exceeds allowed upload size.'], 413);
        }

        $mime = '';
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $detected = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);
                if (is_string($detected) && $detected !== '') {
                    $mime = sanitize_text_field($detected);
                }
            }
        }

        if ($mime === '' && function_exists('mime_content_type')) {
            $detected = mime_content_type($file['tmp_name']);
            if (is_string($detected) && $detected !== '') {
                $mime = sanitize_text_field($detected);
            }
        }

        if ($mime === '') {
            $mime = sanitize_text_field($file['type'] ?? '');
        }

        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

        if (!in_array($mime, $allowed, true)) {
            wp_send_json_error(['message' => 'Unsupported file type.'], 415);
        }

        $url = $this->api_base() . '/' . ltrim($path, '/');

        $fields = [
            'file' => curl_file_create($file['tmp_name'], $mime, sanitize_file_name((string) ($file['name'] ?? 'upload'))),
            'queryOverride' => sanitize_text_field(wp_unslash($_POST['queryOverride'] ?? '')),
            'clientReference' => sanitize_text_field(wp_unslash($_POST['clientReference'] ?? '')),
            'source' => 'wordpress_logged_user_image',
            'wpUserId' => (string) get_current_user_id(),
            'wordpressSite' => $this->wordpress_site_header(),
        ];

        $headers = [
            'Accept: application/json',
            'x-kydex-notary-key: ' . $this->api_key(),
            'x-kydex-client: ' . self::API_CLIENT,
            'x-kydex-plugin-version: ' . self::VERSION,
            'x-kydex-wordpress-site: ' . $this->wordpress_site_header(),
        ];

        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $fields,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => intval($s['request_timeout']),
        ]);

        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        curl_close($ch);

        if ($raw === false) {
            wp_send_json_error(['message' => $error ?: 'Unknown cURL error'], 500);
        }

        $data = json_decode($raw, true);

        if ($code >= 200 && $code < 300) {
            wp_send_json_success($data);
        }

        wp_send_json_error($data ?: ['raw' => $raw], $code);
    }

    public function ajax_manual_screen() {
        $this->verify_ajax();

        $payload = [
            'query' => sanitize_text_field(wp_unslash($_POST['query'] ?? '')),
            'dateOfBirth' => sanitize_text_field(wp_unslash($_POST['dateOfBirth'] ?? '')),
            'nationality' => sanitize_text_field(wp_unslash($_POST['nationality'] ?? '')),
            'clientReference' => sanitize_text_field(wp_unslash($_POST['clientReference'] ?? '')),
            'screeningType' => 'ofac',
            'source' => 'wordpress_logged_user',
            'wpUserId' => get_current_user_id(),
            'wordpressSite' => $this->wordpress_site_header(),
        ];

        if (!$payload['query']) {
            wp_send_json_error(['message' => 'Full name is required.'], 400);
        }

        $this->kydex_request(
            'POST',
            'notaries/' . $this->notary_slug() . '/screening/search',
            $payload
        );
    }

    public function ajax_image_screen() {
        $this->verify_ajax();

        $this->kydex_image_request(
            'notaries/' . $this->notary_slug() . '/screening/image'
        );
    }

    public function ajax_audit_lookup() {
        $this->verify_ajax();

        $auditId = sanitize_text_field(wp_unslash($_POST['auditId'] ?? ''));

        if (!$auditId) {
            wp_send_json_error(['message' => 'Audit ID is required.'], 400);
        }

        $this->kydex_request('GET', 'screening/audit/' . rawurlencode($auditId));
    }

    public function ajax_connection_test() {
        $this->verify_ajax();

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Admin only.'], 403);
        }

        $this->kydex_request('GET', 'notaries/' . $this->notary_slug() . '/screening/config');
    }

    public function ajax_ofac_health() {
        $this->admin_status_call('ofac/health');
    }

    public function ajax_ofac_lists() {
        $this->admin_status_call('ofac/lists');
    }

    public function ajax_ofac_programs() {
        $this->admin_status_call('ofac/programs');
    }

    public function ajax_sync_status() {
        $this->admin_status_call('ofac/sync/status');
    }

    private function admin_status_call($path) {
        $this->verify_ajax();

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Admin only.'], 403);
        }

        $this->kydex_request('GET', $path);
    }
}

register_activation_hook(__FILE__, ['Kydex_Notary_Dashboard', 'activate']);

add_action('plugins_loaded', function () {
    new Kydex_Notary_Dashboard();
});