const fs = require('fs');
let html = fs.readFileSync('../index.html', 'utf8');

const regex = /<div class="timeline-img-wrapper">\s*<picture>([\s\S]*?)<\/picture>\s*<\/div>\s*<div class="timeline-header-flex">\s*<h4 class="timeline-title">(.*?)<\/h4>\s*<div class="timeline-icon-animate ([^"]+)">([\s\S]*?)<\/div>\s*<\/div>/g;

html = html.replace(regex, `<div class="timeline-img-wrapper">
                                <picture>$1</picture>
                                <div class="polaroid-text">
                                    <h4 class="timeline-title">$2</h4>
                                    <div class="timeline-icon-animate $3">$4</div>
                                </div>
                            </div>`);

fs.writeFileSync('../index.html', html);
console.log('HTML updated');
