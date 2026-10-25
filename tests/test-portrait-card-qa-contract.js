/**
 * AI 画像 →「整理为公开介绍」→ 资料卡（自我介绍 + 三题问答）契约。
 *
 * 产品链路：
 *   注册/完善资料 → AI 画像收尾页入口 → 知遇对话 → 确认画像
 *   → 整理为公开介绍（自我介绍 / 理想另一半 / 喜欢什么运动 / 期待的爱情 / 兴趣标签）
 *   → 用户逐项确认 → 写入 user_profile（self_intro / qa_answers / personal_tags）
 *   → 资料页「Ta的问答」可见。
 *
 * 本用例只做源码契约断言（仓库既有风格，不依赖 node_modules）。
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const read = (relative) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')

const resultPage = read('pagesSub/profileExtra/my-portrait-result.uvue')
const onboardingPage = read('pagesSub/userExtra/onboarding/profile.uvue')
const detailPage = read('pagesSub/userExtra/user/detail.uvue')

/** 取某个函数/方法的源码块，用于把断言限定在作用域内。 */
const sliceFrom = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  assert.ok(start >= 0, '找不到起始标记：' + startMarker)
  const end = source.indexOf(endMarker, start)
  assert.ok(end > start, '找不到结束标记：' + endMarker)
  return source.slice(start, end)
}

// ========== 一、成稿行必须包含三题问答 ==========
// 后端 prompt（profile_card_summarize.py）已产出 qa_1_partner / qa_3_love /
// qa_2_sports_candidates，前端只采用 self_intro 就等于把问答丢掉。

assert.match(
  resultPage,
  /const PROFILE_QA_LABELS: any = \{/,
  '问答题面必须以常量集中定义，避免三处散落文案'
)
assert.match(
  resultPage,
  /1: '你理想中的另一半是什么样的'/,
  '第 1 题文案必须与后端 QA_QUESTION_TEXTS 一致'
)
assert.match(
  resultPage,
  /2: '喜欢什么运动'/,
  '第 2 题文案必须与后端 QA_QUESTION_TEXTS 一致'
)
assert.match(
  resultPage,
  /3: '你期待的爱情是什么样子的'/,
  '第 3 题文案必须与后端 QA_QUESTION_TEXTS 一致'
)

assert.match(
  resultPage,
  /add\('qa_1_partner',\s*PROFILE_QA_LABELS\[1\],\s*1\)/,
  'buildProfileCardRows 必须把 qa_1_partner 变成可采用的成稿行'
)
assert.match(
  resultPage,
  /add\('qa_2_sports_candidates',\s*PROFILE_QA_LABELS\[2\],\s*2\)/,
  'buildProfileCardRows 必须把 qa_2_sports_candidates 变成可采用的成稿行'
)
assert.match(
  resultPage,
  /add\('qa_3_love',\s*PROFILE_QA_LABELS\[3\],\s*3\)/,
  'buildProfileCardRows 必须把 qa_3_love 变成可采用的成稿行'
)

// ========== 二、「已有答案不覆盖」必须与后端同口径 ==========
// 后端 profile_card.py：qid != 2 且已有答案时 skipped，只有运动题会覆盖。
// 前端若照旧默认勾选「采用」，用户会以为第 1/3 题被改写。

assert.match(
  resultPage,
  /questionId != 2 && this\.profileCardExistingQaIds\.indexOf\(questionId\) >= 0/,
  '已有答案的 qa_1/qa_3 必须标记为不可覆盖（与后端 skip 口径一致），只有第 2 题可覆盖'
)
assert.match(
  resultPage,
  /selected: !locked/,
  '不可覆盖的问答行不得默认选中「采用」'
)
assert.match(
  resultPage,
  /profileCardExistingQaIds: \[\] as number\[\]/,
  '必须记录已有回答的题号，才能在弹层如实标注'
)
assert.match(
  resultPage,
  /Array\.isArray\(profile\.qa_answers\)/,
  '已有回答必须从本人资料的 qa_answers 读取，不能凭空假设为空'
)

// ========== 三、采用时必须真的提交 qa_answers ==========

assert.match(
  resultPage,
  /const qaAnswers: any\[\] = \[\]/,
  'applyProfileCard 必须收集问答答案'
)
assert.match(
  resultPage,
  /question_id: Number\(row\.questionId\)/,
  '提交结构必须带 question_id（后端 ProfileQaAnswer 只接受 1/2/3）'
)
assert.match(
  resultPage,
  /answer: answer\.length > PROFILE_QA_MAX_LENGTH \? answer\.slice\(0, PROFILE_QA_MAX_LENGTH\) : answer/,
  '答案必须按后端 300 字上限截断，而不是交给服务端静默报错'
)
assert.match(
  resultPage,
  /accepted\.qa_answers = qaAnswers/,
  '选中的问答必须组装进 accepted.qa_answers，否则永远不会写进资料'
)

// ========== 四、写入后必须回读核对（不能只信回执） ==========

assert.match(
  resultPage,
  /key\.indexOf\('qa_'\) == 0/,
  'written_fields 里的 qa_N 必须被识别并回读核对'
)
assert.match(
  resultPage,
  /Number\(item\.question_id\) == qid/,
  '回读核对必须按 question_id 比对服务端 qa_answers'
)

// ========== 五、注册/完善资料后的画像入口 ==========

assert.match(
  onboardingPage,
  /import \{ getContinuousMoxiangState \} from '@\/api\/ai-moxiang\.uts'/,
  '收尾页必须复用已有画像状态接口做只读探测，不得另造探测接口'
)
assert.match(
  onboardingPage,
  /const finished = ref\(false\)/,
  '资料保存成功后必须切到收尾页，而不是直接跳首页'
)
assert.match(
  onboardingPage,
  /aiEntryAvailable\.value = businessCode != 'AI_FEATURE_DISABLED'/,
  '只有服务端明确关闭能力时才降级入口；网络抖动不能把入口藏掉'
)
assert.match(
  onboardingPage,
  /url: '\/pagesSub\/profileExtra\/my-portrait-master'/,
  '画像入口必须跳到知遇主页面（continuous_v2 默认流程）'
)
assert.match(
  onboardingPage,
  /uni\.redirectTo\(\{/,
  '跳画像必须用 redirectTo，返回键不能退回已填完的资料页'
)

// 保存成功后不得再直接 switchTab（入口被绕过）
const nextStepBlock = sliceFrom(onboardingPage, 'const nextStep = async () => {', '\n\tconst probeAiPortraitEntry')
assert.ok(
  nextStepBlock.indexOf('switchTab') < 0,
  '资料保存成功分支不得直接 switchTab 首页，必须停在收尾页给 AI 画像入口'
)
assert.ok(
  nextStepBlock.indexOf('finished.value = true') >= 0,
  '资料保存成功必须进入收尾页'
)
assert.ok(
  nextStepBlock.indexOf('probeAiPortraitEntry()') >= 0,
  '进入收尾页必须触发一次画像能力探测'
)

// ========== 六、名片侧必须能展示问答 ==========

assert.match(detailPage, /qaAnswers: \[\] as any\[\]/, '详情页 user 必须持有 qaAnswers 字段')
assert.match(detailPage, /qaAnswers: qaAnswers,/, '详情页必须把映射结果写回 user')
assert.match(
  detailPage,
  /Array\.isArray\(profile\.qa_answers\)/,
  '问答必须从后端已返回的 profile.qa_answers 取，不能改成再发一次请求'
)
assert.match(
  detailPage,
  /v-if="user\.qaAnswers\.length > 0"/,
  '问答为空时不得渲染空壳区块'
)
assert.match(
  detailPage,
  /<text class="qa-question">\{\{ item\.question \}\}<\/text>/,
  '名片必须同时展示问题与答案，只有答案读者无法理解'
)

// ========== 七、行为验证：真的提交了三条 qa_answers（依赖可用时） ==========
// 与 test-ai-profile-page.js 同法：剥掉 import 后编译页面脚本，在沙箱里驱动 applyProfileCard。
let deps = null
try {
  deps = { vm: require('node:vm'), babel: require('@babel/core'), sfc: require('@vue/compiler-sfc') }
} catch (error) {
  deps = null
  console.log('SKIP portrait card qa behavior（缺少 @babel/core 或 @vue/compiler-sfc）')
}

if (deps != null) {
  const sfcParsed = deps.sfc.parse(resultPage)
  const script = sfcParsed.descriptor.script.content
    .replace(/^\s*import .*$/gm, '')
    .replace('export default', 'globalThis.pageOptions =')
  const executable = deps.babel.transformSync(script, {
    filename: 'portrait.ts',
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-typescript']
  }).code
  const plain = (value) => JSON.parse(JSON.stringify(value))
  const draftFixture = () => ({
    draft_id: 'card-1',
    expected_revision: 1,
    source_revision_id: 88,
    base_profile_revision: 3,
    status: 'ready',
    fields: {
      self_intro: { value: '我很喜欢周末逛书店' },
      qa_1_partner: { value: '希望遇到一个能一起安静待着的人' },
      qa_2_sports_candidates: { candidates: ['跑步', '徒步'] },
      qa_3_love: { value: '我期待的爱情是并肩的队友' },
      interest_tag_candidates: { candidates: ['逛书店'] }
    }
  })

  const harness = (existingQa) => {
    const writes = []
    let sequence = 0
    const sandbox = {
      MoxiangPosterSheet: {},
      setInterval: () => 0,
      clearInterval: () => {},
      uni: {
        getSystemInfoSync: () => ({ windowWidth: 390 }),
        getMenuButtonBoundingClientRect: () => null,
        showToast: () => {},
        showModal() {}
      },
      createProfileCardIdempotencyKey: (prefix) => prefix + '-' + (++sequence),
      isProfileCardVersionConflict: (response) => response.code === 409,
      applyProfileCardDraft: async (payload) => {
        writes.push(plain(payload))
        return { success: true, data: { expected_revision: 2, written_fields: ['self_intro', 'qa_1', 'qa_2', 'qa_3'], skipped_fields: [], profile: {} } }
      },
      summarizeProfileCard: async () => ({ success: true, data: { task_id: 'task-1', draft_id: 'card-1' } }),
      waitForProfileCardTask: async () => ({ done: true, status: 'succeeded', error: '' }),
      getProfileCardDraft: async () => ({ success: true, data: draftFixture() }),
      getOwnProfile: async () => ({ success: true, data: { profile: { personal_tags: [], self_intro: '', qa_answers: existingQa } } })
    }
    deps.vm.runInNewContext(executable, sandbox, { filename: 'portrait.ts' })
    const page = sandbox.pageOptions.data()
    for (const [name, method] of Object.entries(sandbox.pageOptions.methods)) page[name] = method.bind(page)
    for (const [name, getter] of Object.entries(sandbox.pageOptions.computed)) Object.defineProperty(page, name, { get: getter.bind(page) })
    Object.assign(page, {
      narrative: { status: 'confirmed' },
      profileCardVisible: true,
      profileCardDraftId: 'card-1',
      profileCardExpectedRevision: 1,
      profileCardSourceRevisionId: 88,
      profileCardBaseProfileRevision: 3,
      profileCardTagApplyMode: 'merge',
      pageAlive: true
    })
    return { page, writes }
  }

  ;(async () => {
    // 新用户：5 行成稿，确认后提交 3 条问答
    {
      const { page, writes } = harness([])
      await page.refreshProfileCardTagBudget()
      page.profileCardRows = plain(page.buildProfileCardRows(draftFixture().fields))
      const keys = page.profileCardRows.map((row) => row.key)
      assert.deepStrictEqual(
        keys,
        ['self_intro', 'qa_1_partner', 'qa_2_sports_candidates', 'qa_3_love', 'interest_tag_candidates'],
        '成稿必须按「自我介绍 → 3 题问答 → 兴趣标签」顺序生成 5 行'
      )
      await page.applyProfileCard()
      const accepted = writes[0].accepted
      assert.strictEqual(accepted.qa_answers.length, 3, '确认采用必须提交 3 条问答')
      assert.deepStrictEqual(accepted.qa_answers.map((item) => item.question_id), [1, 2, 3], '问答必须按题号 1/2/3 提交')
      assert.strictEqual(accepted.qa_answers[1].answer, '跑步、徒步', '第 2 题候选必须拼成一句可读答案')
      assert.strictEqual(accepted.qa_answers[0].question, '你理想中的另一半是什么样的', '题面必须随答案一起提交')
    }
    // 老用户：第 1/3 题已有答案 → 锁定、不默认采用、不提交；第 2 题仍可覆盖
    {
      const { page, writes } = harness([
        { question_id: 1, question: '你理想中的另一半是什么样的', answer: '旧的答案' },
        { question_id: 3, question: '你期待的爱情是什么样子的', answer: '旧的答案' }
      ])
      await page.refreshProfileCardTagBudget()
      page.profileCardRows = plain(page.buildProfileCardRows(draftFixture().fields))
      const qa1 = page.profileCardRows.filter((row) => row.key == 'qa_1_partner')[0]
      const qa2 = page.profileCardRows.filter((row) => row.key == 'qa_2_sports_candidates')[0]
      assert.strictEqual(qa1.locked, true, '已有答案的第 1 题必须锁定')
      assert.strictEqual(qa1.selected, false, '已有答案的第 1 题不得默认采用')
      assert.strictEqual(qa2.locked, false, '第 2 题可覆盖，不应锁定')
      assert.strictEqual(qa2.selected, true, '第 2 题应默认采用')
      await page.applyProfileCard()
      assert.deepStrictEqual(
        writes[0].accepted.qa_answers.map((item) => item.question_id),
        [2],
        '已有答案的第 1/3 题不得重复提交，只提交可覆盖的第 2 题'
      )
    }
    console.log('PASS portrait card qa behavior')
  })().catch((error) => {
    console.error('FAIL portrait card qa behavior: ' + error.message)
    process.exitCode = 1
  })
}

console.log('PASS portrait card qa contract')
