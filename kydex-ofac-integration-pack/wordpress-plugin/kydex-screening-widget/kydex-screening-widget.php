<?php
/**
 * Plugin Name: KYDEX Screening Widget
 * Description: Adds a KYDEX-powered OFAC screening widget to an individual notary webpage. The widget calls KYDEX only, never OFAC directly.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

function kydex_screening_widget_assets() {
    wp_enqueue_style(
        'kydex-screening-widget',
        plugin_dir_url(__FILE__) . 'kydex-screening-widget.css',
        array(),
        '1.0.0'
    );

    wp_enqueue_script(
        'kydex-screening-widget',
        plugin_dir_url(__FILE__) . 'kydex-screening-widget.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'kydex_screening_widget_assets');

function kydex_screening_widget_shortcode($atts) {
    $atts = shortcode_atts(array(
        'endpoint' => 'https://kydex.me/api/v1/notaries/sandranassif/screening/search',
        'api_key' => '',
        'title' => 'KYDEX OFAC Screening',
    ), $atts);

    $endpoint = esc_url($atts['endpoint']);
    $api_key = esc_attr($atts['api_key']);
    $title = esc_html($atts['title']);

    ob_start();
    ?>
    <section class="kydex-widget" data-kydex-endpoint="<?php echo $endpoint; ?>" data-kydex-api-key="<?php echo $api_key; ?>">
      <div class="kydex-widget__header">
        <p class="kydex-widget__eyebrow">KYDEX Screening</p>
        <h2><?php echo $title; ?></h2>
        <p>Search KYDEX’s locally synchronized OFAC index. Results require professional review.</p>
      </div>

      <div class="kydex-widget__form">
        <label>
          Full name
          <input type="text" data-kydex-field="query" placeholder="Enter full name" />
        </label>

        <label>
          Date of birth, optional
          <input type="text" data-kydex-field="dateOfBirth" placeholder="YYYY-MM-DD" />
        </label>

        <label>
          Nationality, optional
          <input type="text" data-kydex-field="nationality" placeholder="Lebanese" />
        </label>

        <label>
          Reference, optional
          <input type="text" data-kydex-field="clientReference" placeholder="Internal file/reference number" />
        </label>

        <button type="button" data-kydex-action="submit">Run KYDEX screening</button>
      </div>

      <div class="kydex-widget__result" data-kydex-result hidden></div>

      <p class="kydex-widget__disclaimer">
        KYDEX screening results are decision-support outputs and require professional review before any legal or compliance decision.
      </p>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('kydex_screening', 'kydex_screening_widget_shortcode');
