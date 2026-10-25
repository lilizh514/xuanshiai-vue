const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const paperPlane = fs.readFileSync(path.join(root, 'pagesSub/community/paper-plane.uvue'), 'utf8')

assert.match(paperPlane, /<view class="hero">/)
assert.match(paperPlane, /PAPER PLANE · 认真表达/)
assert.match(paperPlane, /把想说的话轻轻放出去/)
assert.match(paperPlane, /给这一刻留一句话，也给未来的自己留一个回声。/)
assert.match(paperPlane, /<view class="hero-mark">/)
assert.match(paperPlane, /hero-plane/)
assert.match(paperPlane, /hero-spark/)

assert.match(paperPlane, /<view class="hero-identity" @click="openPaperPlaneProfileEditor">/)
assert.match(paperPlane, /hero-identity-avatar/)
assert.match(paperPlane, /paperPlaneProfile\.nickname/)
assert.match(paperPlane, /paperPlaneProfile\.initialized/)
assert.doesNotMatch(paperPlane, /<view class="plane-profile-bar">/)

// 额度文案改为服务端 remain + 本地已捡分开展示，不再相加混算
assert.match(paperPlane, /今日可扔：\{\{ remain \}\} 次/)
assert.match(paperPlane, /今日已捡：\{\{ catchCount \}\} 次/)
assert.match(paperPlane, /@click="openPlaneQuota"/)
assert.match(paperPlane, />获取纸飞机<\/text>/)
assert.match(paperPlane, /<view class="quiet-note">/)
assert.match(paperPlane, /<view class="bottom-dock">/)
assert.match(paperPlane, /@click="openComposerMenu"/)
assert.match(paperPlane, /@click="openCatchMenu"/)
assert.match(paperPlane, /@click="openPaperPlaneMessages"/)

assert.match(paperPlane, /\.hero\s*\{[\s\S]*?background:\s*var\(--plane-cloud\);/)
assert.match(paperPlane, /\.hero-mark\s*\{[\s\S]*?background:\s*var\(--plane-lilac\);/)
assert.match(paperPlane, /\.hero-identity-avatar\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/)
assert.match(paperPlane, /\.page\s*\{[\s\S]*?overflow-x:\s*hidden;[\s\S]*?overflow-y:\s*auto;/)
assert.match(paperPlane, /\.bottom-dock\s*\{[\s\S]*?position:\s*fixed;/)

console.log('paper-plane hybrid UI contract passed')
