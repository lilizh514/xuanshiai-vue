/**
 * 浏览额度「按不同用户计数」契约。
 *
 * 产品规则：普通用户每日可查看 8 个不同用户、VIP 20 个不同用户；
 * 同一个用户当日无论看多少次只计 1 个。
 * 本用例只做源码契约断言（仓库既有风格，不依赖 node_modules）。
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const read = (relative) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')

const quota = read('utils/quota.uts')
const indexPage = read('pages/index/index.uvue')
const detailPage = read('pagesSub/userExtra/user/detail.uvue')
const vipPage = read('pagesSub/profileExtra/vip.uvue')

// ========== 额度工具：状态结构与去重 ==========

assert.match(
  quota,
  /viewedUserIds\s*:\s*number\[\]/,
  '额度状态必须记录当日已浏览的用户 id 集合，而不是单一计数'
)
assert.match(
  quota,
  /xsa_daily_view_state_v2:/,
  '额度存储必须升级为按 user_id 分键的 v2 键，避免多账号共用一份计数'
)
assert.match(
  quota,
  /recordProfileView\s*\(\s*targetUserId\s*:\s*number\s*\)\s*:\s*boolean/,
  'recordProfileView 必须接收 targetUserId，才能按用户去重'
)
assert.match(
  quota,
  /viewedUserIds\.indexOf\(targetUserId\)\s*>=\s*0\)\s*return true/,
  '已浏览过的用户必须直接放行、不消耗额度（幂等）'
)
assert.match(
  quota,
  /viewedUserIds\.length\s*>=\s*limit/,
  '额度上限必须按集合长度判定，而不是按累计次数'
)
assert.match(
  quota,
  /export function rollbackProfileView/,
  '必须提供 429 回滚函数，避免被服务端拒绝后白扣一位'
)
assert.match(
  quota,
  /export function isUserViewed/,
  '必须提供当日是否已浏览查询，供 UI 复用'
)
assert.doesNotMatch(
  quota,
  /export function resetDailyViewUsage/,
  '去重模型下不允许「清零已用」，否则升级 VIP 会把已看过的人变回新人'
)

// ========== 首页：扣「下一个」且先判空 ==========

const switchStart = indexPage.indexOf('const switchToNextRecommend')
assert.ok(switchStart > 0, '首页必须保留 switchToNextRecommend')
const switchBlock = indexPage.slice(switchStart, switchStart + 900)

assert.match(switchBlock, /if \(list\.length === 0\) return/, '空列表必须先返回，不能消耗额度')
assert.match(switchBlock, /recordProfileView\(nextId\)/, '首页扣次必须针对「下一个」用户 id，而不是当前用户')
assert.ok(
  switchBlock.indexOf('list.length === 0') < switchBlock.indexOf('recordProfileView(nextId)'),
  '判空必须发生在记录额度之前'
)
assert.doesNotMatch(
  switchBlock,
  /recordProfileView\(\)/,
  '不允许继续调用无参的 recordProfileView'
)

// ========== 详情页：打开即计入，且限流入口统一 ==========

assert.match(
  detailPage,
  /recordProfileView,\s*rollbackProfileView[\s\S]*?from '@\/utils\/quota\.uts'/,
  '详情页必须引入额度记录与回滚'
)
assert.match(
  detailPage,
  /const countsAsBrowse = !isOwnProfile\.value && !isPreview\.value && !fromMatchmaker\.value && parsed > 0/,
  '详情页必须排除本人主页、预览、红娘代看'
)
assert.ok(
  detailPage.indexOf('countsAsBrowse') < detailPage.indexOf('await load()'),
  '额度判定必须发生在 load() 之前，否则错误态会被 load 清空'
)
assert.match(
  detailPage,
  /if \(isQuota\) rollbackProfileView\(user\.value\.id\)/,
  '服务端 429 时必须回滚本地这一位额度'
)

// ========== 会员升级：只提上限，不清集合 ==========

assert.doesNotMatch(
  vipPage,
  /resetDailyViewUsage/,
  '开通会员后不能清空当日已浏览集合'
)
assert.match(
  vipPage,
  /setCurrentUserVipStatus\(true\)/,
  '开通会员后必须回写本地 VIP 状态，否则本地仍按普通用户上限判定'
)

console.log('PASS quota dedup contract')
