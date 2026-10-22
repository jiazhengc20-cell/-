const STORAGE_KEY = "wish-atelier-state-v3";
const HISTORY_STORAGE_KEY = "wish-atelier-history-v1";
// Fill these two values with Supabase Project Settings → API values.
const SUPABASE_URL = "https://vfmsovievdgytycizavi.supabase.co";
const SUPABASE_KEY = "sb_publishable_a7BlLotAoQM2MC1yTSVgow_a8l5sYio";
const CLOUD_ROW_TITLE = "咕噜咕噜的愿望箱";
const STORAGE_BUCKET = "wish-images";
const DEFAULT_COVER = "outputs/05-sip-wood-hush-zine.png";
const DEFAULT_CATEGORY_COVER = "outputs/08-wrapped-light-bouquet-zine.png";
const PRIORITIES = ["小小念头", "最近惦记", "非常想实现", "值得认真准备"];

const seedState = {
  activeCategoryId: "travel",
  activeWishId: "wish-1",
  activeView: "categories",
  anniversaries: [],
  categories: [
    { id: "travel", name: "旅游", color: "#1640df", cover: "outputs/06-slow-window-light-zine.png" },
    { id: "food", name: "美食", color: "#6f8d5f", cover: "outputs/02-glass-light-stillness-zine.png" },
    { id: "gift", name: "礼物", color: "#b06b45", cover: "outputs/08-wrapped-light-bouquet-zine.png" },
  ],
  wishes: [
    {
      id: "wish-1",
      categoryId: "travel",
      title: "在海边住一个清晨",
      note: "她说想醒来就能看到光落在水面上。先收藏几个安静一点的小岛民宿。",
      fulfilledAt: "",
      wishAt: "",
      privatePrep: "想找一家不用赶路的海边民宿，提前查一下日出时间。",
      diary: "",
      priority: "最近惦记",
      memory: "准备挑一个不用赶行程的周末，只做散步、拍照、喝热的东西。",
      createdBy: "最初的愿望收集者",
      preparedBy: "",
      revealedPrep: "",
      memoryImage: "",
      fulfilledBy: "",
      image: "outputs/06-slow-window-light-zine.png",
    },
    {
      id: "wish-2",
      categoryId: "food",
      title: "找一家窗边的抹茶店",
      note: "有木窗、书架、光线慢一点，最好能坐很久。",
      fulfilledAt: "2026-08-30",
      wishAt: "",
      privatePrep: "提前挑窗边位置，记得避开太吵的时段。",
      diary: "那天阳光靠在窗框上，抹茶的冰块慢慢化开。她说这个绿色很像夏天快结束的时候，于是这件小事就被收进来了。",
      priority: "非常想实现",
      memory: "那天她一直盯着杯子里的冰块，说这个绿色很像夏天快结束的时候。",
      createdBy: "最初的愿望收集者",
      preparedBy: "",
      revealedPrep: "",
      memoryImage: "",
      fulfilledBy: "",
      image: "outputs/02-glass-light-stillness-zine.png",
    },
    {
      id: "wish-3",
      categoryId: "gift",
      title: "送一本写满批注的书",
      note: "不是贵重礼物，是把想说的话夹在页边。",
      fulfilledAt: "",
      wishAt: "2026-10-01",
      privatePrep: "可以先选一本她最近会喜欢的书，把想说的话写在便签里。",
      diary: "",
      priority: "小小念头",
      memory: "",
      createdBy: "最初的愿望收集者",
      preparedBy: "",
      revealedPrep: "",
      memoryImage: "",
      fulfilledBy: "",
      image: "outputs/04-between-pages-zine.png",
    },
  ],
};

let state = loadState();
let cloudSaveTimer = null;
let cloudChannel = null;
let currentSession = null;
let currentProfileName = "";
let fulfillingWish = null;
let activeMemoryWishId = null;
let historyItems = [];
let historyDebounceTimer = null;
let memorySortOrder = localStorage.getItem("wish-memory-sort") || "desc";
let lastLocalCloudWriteAt = 0;
let pendingRemoteRefresh = false;
const cloudReady = Boolean(
  window.supabase &&
  !SUPABASE_URL.startsWith("YOUR_") &&
  !SUPABASE_KEY.startsWith("YOUR_")
);
const supabaseClient = cloudReady
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const categoryList = document.querySelector("#categoryList");
const wishList = document.querySelector("#wishList");
const detailPanel = document.querySelector("#detailPanel");
const board = document.querySelector(".board");
const memoryBoard = document.querySelector("#memoryBoard");
const memoryList = document.querySelector("#memoryList");
const activeCategoryTitle = document.querySelector("#activeCategoryTitle");
const categoryForm = document.querySelector("#categoryForm");
const categoryName = document.querySelector("#categoryName");
const categoryColor = document.querySelector("#categoryColor");
const categoryCover = document.querySelector("#categoryCover");
const categoryViewButton = document.querySelector("#categoryViewButton");
const memoryViewButton = document.querySelector("#memoryViewButton");
const drawWishButton = document.querySelector("#drawWishButton");
const memorySortButton = document.querySelector("#memorySortButton");
const exportProgressButton = document.querySelector("#exportProgressButton");
const importProgressButton = document.querySelector("#importProgressButton");
const cloudProgressButton = document.querySelector("#cloudProgressButton");
const historyButton = document.querySelector("#historyButton");
const importProgressFile = document.querySelector("#importProgressFile");
const backupStatus = document.querySelector("#backupStatus");
const anniversaryList = document.querySelector("#anniversaryList");
const anniversaryForm = document.querySelector("#anniversaryForm");
const authStatus = document.querySelector("#authStatus");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authLoginButton = document.querySelector("#authLoginButton");
const authLogoutButton = document.querySelector("#authLogoutButton");
const profileControls = document.querySelector("#profileControls");
const usernameInput = document.querySelector("#usernameInput");
const saveUsernameButton = document.querySelector("#saveUsernameButton");
const fulfillDialog = document.querySelector("#fulfillDialog");
const fulfillForm = document.querySelector("#fulfillForm");
const fulfilledDateInput = document.querySelector("#fulfilledDateInput");
const fulfilledPhotoInput = document.querySelector("#fulfilledPhotoInput");
const fulfilledPhotoPreview = document.querySelector("#fulfilledPhotoPreview");
const fulfilledStoryInput = document.querySelector("#fulfilledStoryInput");
const memoryDetailDialog = document.querySelector("#memoryDetailDialog");
const memoryDetailContent = document.querySelector("#memoryDetailContent");
const historyDialog = document.querySelector("#historyDialog");
const historyList = document.querySelector("#historyList");

document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "full",
}).format(new Date());

document.querySelector("#addCategoryButton").addEventListener("click", () => {
  categoryForm.classList.toggle("hidden");
  if (!categoryForm.classList.contains("hidden")) categoryName.focus();
});

document.querySelector("#addWishButton").addEventListener("click", showWishForm);
document.querySelector("#newWishTopButton").addEventListener("click", showWishForm);
categoryViewButton.addEventListener("click", () => setActiveView("categories"));
memoryViewButton.addEventListener("click", () => setActiveView("memories"));
drawWishButton.addEventListener("click", drawTodayWish);
document.querySelector("#addAnniversaryButton").addEventListener("click", () => anniversaryForm.classList.toggle("hidden"));
anniversaryForm.addEventListener("submit", submitAnniversary);
memorySortButton.addEventListener("click", () => {
  memorySortOrder = memorySortOrder === "desc" ? "asc" : "desc";
  localStorage.setItem("wish-memory-sort", memorySortOrder);
  updateMemorySortButton();
  renderMemories();
});
exportProgressButton.addEventListener("click", () => exportProgress());
importProgressButton.addEventListener("click", () => importProgressFile.click());
cloudProgressButton.addEventListener("click", saveProgressForCloud);
historyButton.addEventListener("click", openHistoryDialog);
importProgressFile.addEventListener("change", importProgress);

authLoginButton.addEventListener("click", signIn);
authLogoutButton.addEventListener("click", signOut);
saveUsernameButton.addEventListener("click", saveUsername);
document.querySelector("#cancelFulfillButton").addEventListener("click", closeFulfillDialog);
document.querySelector("#closeFulfillDialog").addEventListener("click", closeFulfillDialog);
fulfilledPhotoInput.addEventListener("change", previewFulfilledPhoto);
fulfillForm.addEventListener("submit", submitFulfilledWish);
document.querySelector("#closeHistoryDialog").addEventListener("click", () => historyDialog.close());
historyDialog.addEventListener("click", (event) => {
  if (event.target === historyDialog) historyDialog.close();
});
historyList.addEventListener("click", handleHistoryAction);
memoryDetailContent.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-memory]")) memoryDetailDialog.close();
});
memoryDetailContent.addEventListener("submit", submitMemoryComment);
memoryDetailDialog.addEventListener("click", (event) => {
  if (event.target === memoryDetailDialog) memoryDetailDialog.close();
});

detailPanel.addEventListener("focusout", () => {
  window.setTimeout(async () => {
    if (detailPanel.contains(document.activeElement)) return;
    if (!pendingRemoteRefresh) return;
    pendingRemoteRefresh = false;
    await loadWishData();
  }, 0);
});

if (!cloudReady) {
  authStatus.textContent = "填入 Supabase 配置后即可开启双人同步";
  authLoginButton.disabled = true;
} else {
  initialiseCloudSync();
}

let pendingCategoryCover = DEFAULT_CATEGORY_COVER;

categoryCover.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    pendingCategoryCover = DEFAULT_CATEGORY_COVER;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    pendingCategoryCover = reader.result;
  };
  reader.readAsDataURL(file);
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = categoryName.value.trim();
  if (!name) return;
  const coverFile = categoryCover.files?.[0];
  const submitButton = categoryForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  let cover = pendingCategoryCover;
  try {
    if (coverFile) cover = await resolveImageValue(coverFile, pendingCategoryCover);
  } catch (error) {
    showBackupStatus(`分类封面上传失败：${error.message}`);
  } finally {
    submitButton.disabled = false;
  }
  const category = {
    id: crypto.randomUUID(),
    name,
    color: categoryColor.value || ["#1640df", "#6f8d5f", "#b06b45", "#2f2923"][state.categories.length % 4],
    cover,
  };
  state.categories.push(category);
  state.activeCategoryId = category.id;
  state.activeWishId = null;
  categoryName.value = "";
  categoryColor.value = "#1640df";
  categoryCover.value = "";
  pendingCategoryCover = DEFAULT_CATEGORY_COVER;
  categoryForm.classList.add("hidden");
  commit("新增分类", "category", category.id);
});

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(seedState);
  try {
    return normalizeState(JSON.parse(stored));
  } catch {
    return structuredClone(seedState);
  }
}

function commit(action = "", targetType = "workspace", targetId = "") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
  scheduleCloudSave();
  if (action) recordHistory(action, targetType, targetId);
}

function queueHistory(action, targetType, targetId) {
  window.clearTimeout(historyDebounceTimer);
  historyDebounceTimer = window.setTimeout(() => recordHistory(action, targetType, targetId), 1200);
}

async function initialiseCloudSync() {
  const { data } = await supabaseClient.auth.getSession();
  updateAuthUI(data.session);
  if (data.session) {
    await loadUserProfile();
    await loadWishData();
    subscribeWishData();
  }
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session);
    if (session) {
      window.setTimeout(async () => {
        await loadUserProfile();
        await loadWishData();
        subscribeWishData();
      }, 0);
    } else if (cloudChannel) {
      supabaseClient.removeChannel(cloudChannel);
      cloudChannel = null;
    }
  });
}

function updateAuthUI(session) {
  currentSession = session;
  const loggedIn = Boolean(session);
  authStatus.textContent = loggedIn
    ? `已登录：${session.user.email}`
    : cloudReady ? "登录后同步你们的愿望箱" : "填入 Supabase 配置后即可开启双人同步";
  authEmail.hidden = loggedIn;
  authPassword.hidden = loggedIn;
  authLoginButton.hidden = loggedIn;
  authLogoutButton.hidden = !loggedIn;
  profileControls.hidden = !loggedIn;
  if (!loggedIn) {
    currentProfileName = "";
    usernameInput.value = "";
  }
}

async function loadUserProfile() {
  const user = await getCloudUser();
  if (!user) return;
  const { data, error } = await supabaseClient
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .limit(1);
  if (error) {
    showBackupStatus(`用户名读取失败：${error.message}`);
    currentProfileName = user.email?.split("@")[0] || "愿望箱成员";
    usernameInput.value = currentProfileName;
    return;
  }
  currentProfileName = data?.[0]?.display_name || user.email?.split("@")[0] || "愿望箱成员";
  usernameInput.value = currentProfileName;
}

async function saveUsername() {
  const user = await getCloudUser();
  const name = usernameInput.value.trim();
  if (!user || !name) {
    showBackupStatus("请先登录并填写用户名。");
    return;
  }
  saveUsernameButton.disabled = true;
  const { error } = await supabaseClient
    .from("user_profiles")
    .upsert({ user_id: user.id, display_name: name, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  saveUsernameButton.disabled = false;
  if (error) {
    showBackupStatus(`用户名保存失败：${error.message}`);
    return;
  }
  currentProfileName = name;
  showBackupStatus(`已记住你是“${name}”。`);
}

function getCurrentProfileName() {
  return currentProfileName || currentSession?.user?.email?.split("@")[0] || "本机成员";
}

async function signIn() {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) {
    authStatus.textContent = "请输入邮箱和密码";
    return;
  }
  authLoginButton.disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  authLoginButton.disabled = false;
  if (error) authStatus.textContent = `登录失败：${error.message}`;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  state.wishes.forEach((wish) => {
    wish.privatePrep = "";
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

async function getCloudUser() {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getUser();
  return data.user;
}

async function loadWishData() {
  const user = await getCloudUser();
  if (!user) return;
  const { data: rows, error } = await supabaseClient
    .from("wish_data")
    .select("data")
    .eq("title", CLOUD_ROW_TITLE)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) {
    authStatus.textContent = `云端读取失败：${error.message}`;
    return;
  }
  const data = rows?.[0];
  if (!data) {
    const { error: insertError } = await supabaseClient
      .from("wish_data")
      .insert({ title: CLOUD_ROW_TITLE, data: getSharedState() });
    if (insertError) {
      authStatus.textContent = `云端初始化失败：${insertError.message}`;
      return;
    }
    await savePrivateNotesToCloud();
    render();
    showBackupStatus("云端还没有愿望箱，已用本机内容初始化。");
    return;
  }
  if (data?.data?.categories && data?.data?.wishes) {
    const cloudState = normalizeState(data.data);
    const localPrivateNotes = new Map(
      state.wishes
        .filter((wish) => (wish.privatePrep || "").trim())
        .map((wish) => [wish.id, wish.privatePrep]),
    );
    const localHasContent = state.categories.length > 0 || state.wishes.length > 0;
    const cloudIsEmpty = cloudState.categories.length === 0 && cloudState.wishes.length === 0;
    if (cloudIsEmpty && localHasContent) {
      await saveWishDataToCloud();
      await savePrivateNotesToCloud();
      render();
      showBackupStatus("云端还是空的，已先把这台设备的愿望箱上传到云端。");
      return;
    }
    state = normalizeState({ ...cloudState, activeCategoryId: state.activeCategoryId, activeView: state.activeView });
    state.wishes.forEach((wish) => {
      wish.privatePrep = "";
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    await loadPrivateNotes(localPrivateNotes);
    render();
    showBackupStatus("已从云端同步最新愿望箱。");
  }
}

function scheduleCloudSave() {
  if (!cloudReady) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(async () => {
    await saveWishDataToCloud();
    await savePrivateNotesToCloud();
  }, 500);
}

async function saveWishDataToCloud() {
  const user = await getCloudUser();
  if (!user) return;
  const { error } = await supabaseClient
    .from("wish_data")
    .update({ data: getSharedState(), updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("title", CLOUD_ROW_TITLE);
  if (error) {
    showBackupStatus(`云端保存失败：${error.message}`);
    return;
  }
  lastLocalCloudWriteAt = Date.now();
  showBackupStatus("已保存到云端，另一台设备会自动同步。");
}

function getLocalHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function recordHistory(action, targetType = "workspace", targetId = "") {
  const entry = {
    id: crypto.randomUUID(),
    action,
    target_type: targetType,
    target_id: targetId || null,
    actor_id: currentSession?.user?.id || null,
    actor_name: getCurrentProfileName(),
    snapshot: getSharedState(),
    user_agent: navigator.userAgent,
    created_at: new Date().toISOString(),
  };
  const localHistory = [entry, ...getLocalHistory()]
    .filter((item) => Date.now() - new Date(item.created_at).getTime() <= 30 * 86400000)
    .slice(0, 100);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(localHistory));
  historyItems = localHistory;
  if (!supabaseClient || !currentSession) return;
  const { error } = await supabaseClient.from("wish_history").insert({
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id,
    actor_id: entry.actor_id,
    actor_name: entry.actor_name,
    snapshot: entry.snapshot,
    user_agent: entry.user_agent,
    created_at: entry.created_at,
  });
  if (error) showBackupStatus(`操作记录保存失败：${error.message}`);
}

async function loadHistory() {
  const localHistory = getLocalHistory();
  if (!supabaseClient || !currentSession) {
    historyItems = localHistory;
    renderHistoryList();
    return;
  }
  const { data, error } = await supabaseClient
    .from("wish_history")
    .select("id, action, target_type, target_id, actor_id, actor_name, snapshot, user_agent, created_at")
    .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    historyItems = localHistory;
    showBackupStatus(`操作记录读取失败：${error.message}`);
  } else {
    historyItems = data || [];
  }
  renderHistoryList();
}

function openHistoryDialog() {
  historyDialog.showModal();
  historyList.innerHTML = '<p class="history-empty">正在读取操作记录……</p>';
  loadHistory();
}

function renderHistoryList() {
  if (!historyItems.length) {
    historyList.innerHTML = '<p class="history-empty">还没有操作记录。下一次关键修改会从这里开始保存。</p>';
    return;
  }
  historyList.innerHTML = historyItems
    .map((item) => {
      const targetLabel = item.target_type === "wish" ? "愿望" : item.target_type === "category" ? "分类" : "愿望箱";
      return `
        <article class="history-item">
          <div class="history-item-copy">
            <strong>${escapeHtml(item.action)}</strong>
            <p>${escapeHtml(item.actor_name || "愿望箱成员")} · ${escapeHtml(formatCommentTime(item.created_at))} · ${targetLabel}</p>
          </div>
          <div class="history-item-actions">
            ${item.target_type === "wish" ? `<button class="backup-button" type="button" data-history-action="wish" data-history-id="${escapeAttribute(item.id)}">恢复此愿望</button>` : ""}
            <button class="backup-button" type="button" data-history-action="workspace" data-history-id="${escapeAttribute(item.id)}">恢复整箱</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function handleHistoryAction(event) {
  const button = event.target.closest("[data-history-action]");
  if (!button) return;
  const item = historyItems.find((history) => history.id === button.dataset.historyId);
  if (!item?.snapshot) return;
  const scope = button.dataset.historyAction === "wish" ? "这个愿望" : "整个愿望箱";
  if (!window.confirm(`确定恢复${scope}到 ${formatCommentTime(item.created_at)} 的版本吗？恢复前会自动备份当前状态。`)) return;
  await recordHistory("恢复前自动备份", "backup", "");
  if (scope === "整个愿望箱") {
    state = normalizeState({ ...item.snapshot, activeCategoryId: state.activeCategoryId, activeView: state.activeView });
  } else {
    const sourceWish = item.snapshot.wishes?.find((wish) => wish.id === item.target_id);
    if (!sourceWish) {
      showBackupStatus("这个历史版本里找不到对应愿望，暂时无法恢复。");
      return;
    }
    const sourceCategory = item.snapshot.categories?.find((category) => category.id === sourceWish.categoryId);
    state.wishes = state.wishes.filter((wish) => wish.id !== sourceWish.id);
    state.wishes.push(sourceWish);
    if (sourceCategory && !state.categories.some((category) => category.id === sourceCategory.id)) {
      state.categories.push(sourceCategory);
    }
  }
  commit("恢复历史版本", scope === "整个愿望箱" ? "workspace" : "wish", item.target_id || "");
  showBackupStatus(`已恢复${scope}，当前状态也已自动留下备份。`);
  await loadHistory();
}

function getSharedState() {
  const sharedState = structuredClone(state);
  sharedState.wishes = sharedState.wishes.map((wish) => ({ ...wish, privatePrep: "" }));
  return sharedState;
}

async function loadPrivateNotes(localPrivateNotes = new Map()) {
  const user = await getCloudUser();
  if (!user) return;
  const { data, error } = await supabaseClient
    .from("private_wish_notes")
    .select("wish_id, private_prep")
    .eq("user_id", user.id);
  if (error) {
    showBackupStatus(`幕后准备区暂时无法读取：${error.message}`);
    return;
  }
  if (!(data || []).length && localPrivateNotes.size) {
    state.wishes.forEach((wish) => {
      wish.privatePrep = localPrivateNotes.get(wish.id) || "";
    });
    await savePrivateNotesToCloud();
    return;
  }
  const notes = new Map((data || []).map((note) => [note.wish_id, note.private_prep || ""]));
  state.wishes.forEach((wish) => {
    wish.privatePrep = notes.get(wish.id) || "";
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function savePrivateNotesToCloud() {
  const user = await getCloudUser();
  if (!user) return;
  const notes = state.wishes
    .filter((wish) => (wish.privatePrep || "").trim())
    .map((wish) => ({
      wish_id: wish.id,
      user_id: user.id,
      private_prep: wish.privatePrep.trim(),
      updated_at: new Date().toISOString(),
    }));
  const { error: clearError } = await supabaseClient
    .from("private_wish_notes")
    .delete()
    .eq("user_id", user.id);
  if (clearError) {
    showBackupStatus(`幕后准备区保存失败：${clearError.message}`);
    return;
  }
  if (!notes.length) return;
  const { error } = await supabaseClient
    .from("private_wish_notes")
    .upsert(notes, { onConflict: "wish_id" });
  if (error) showBackupStatus(`幕后准备区保存失败：${error.message}`);
}

function subscribeWishData() {
  if (cloudChannel) return;
  cloudChannel = supabaseClient
    .channel("wish-data-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "wish_data" }, async () => {
      const editingDetail = detailPanel.contains(document.activeElement);
      if (Date.now() - lastLocalCloudWriteAt < 2500) return;
      if (editingDetail) {
        pendingRemoteRefresh = true;
        showBackupStatus("另一台设备有更新，完成当前编辑后会同步。");
        return;
      }
      await loadWishData();
    })
    .subscribe();
}

function exportProgress(message = "进度备份已下载。") {
  const payload = {
    app: "咕噜咕噜的愿望箱",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gulu-wish-box-${date}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showBackupStatus(message);
}

function importProgress(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedState = parsed.state || parsed;
      if (!Array.isArray(importedState.categories) || !Array.isArray(importedState.wishes)) {
        throw new Error("invalid backup");
      }
      state = normalizeState(importedState);
      commit("导入进度", "workspace", "");
      showBackupStatus("已导入进度，愿望箱恢复好了。");
    } catch {
      showBackupStatus("导入失败：请选择之前导出的愿望箱 JSON 文件。");
    } finally {
      importProgressFile.value = "";
    }
  };
  reader.readAsText(file);
}

function saveProgressForCloud() {
  if (!cloudReady) {
    showBackupStatus("请先在 app.js 填入 Supabase URL 和 Publishable key。");
    return;
  }
  saveWishDataToCloud();
}

function render() {
  const visibleWishes = state.wishes.filter((wish) => wish.categoryId === state.activeCategoryId);
  if (!visibleWishes.some((wish) => wish.id === state.activeWishId)) {
    state.activeWishId = visibleWishes[0]?.id || null;
  }

  renderView();
  renderStats();
  renderAnniversaries();
  renderCategories();
  renderWishes(visibleWishes);
  renderDetail();
  renderMemories();
  if (memoryDetailDialog.open && activeMemoryWishId) {
    const openWish = state.wishes.find((wish) => wish.id === activeMemoryWishId && wish.fulfilledAt);
    if (openWish) openMemoryDetail(openWish);
    else memoryDetailDialog.close();
  }
}

function renderAnniversaries() {
  if (!anniversaryList) return;
  if (!state.anniversaries?.length) {
    anniversaryList.innerHTML = '<p class="anniversary-empty">把想记住的日期收进来。</p>';
    return;
  }
  anniversaryList.innerHTML = state.anniversaries
    .slice()
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
    .map((item) => `
      <article class="anniversary-card">
        ${item.photo ? `<img src="${escapeAttribute(item.photo)}" alt="" />` : ""}
        <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.date)} · ${formatAnniversaryCountdown(item.date)}</span></div>
        <button type="button" class="mini-icon-button" data-delete-anniversary="${escapeAttribute(item.id)}" aria-label="删除纪念日">×</button>
      </article>
    `)
    .join("");
  anniversaryList.querySelectorAll("[data-delete-anniversary]").forEach((button) => {
    button.addEventListener("click", () => {
      state.anniversaries = state.anniversaries.filter((item) => item.id !== button.dataset.deleteAnniversary);
      commit("删除纪念日", "anniversary", button.dataset.deleteAnniversary);
    });
  });
}

async function submitAnniversary(event) {
  event.preventDefault();
  const formData = new FormData(anniversaryForm);
  const name = formData.get("name").trim();
  const date = formData.get("date");
  if (!name || !date) return;
  let photo = "";
  const file = anniversaryForm.querySelector("[name='photo']").files?.[0];
  if (file) photo = await resolveImageValue(file, "");
  const anniversary = { id: crypto.randomUUID(), name, date, photo };
  state.anniversaries.push(anniversary);
  anniversaryForm.reset();
  anniversaryForm.classList.add("hidden");
  commit("新增纪念日", "anniversary", anniversary.id);
}

function daysUntil(value) {
  const target = new Date(`${value}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function formatAnniversaryCountdown(value) {
  const days = daysUntil(value);
  if (days === 0) return "就是今天";
  if (days > 0) return `还有 ${days} 天`;
  return `已过去 ${Math.abs(days)} 天`;
}

function renderStats() {
  document.querySelector("#totalWishes").textContent = state.wishes.length;
  document.querySelector("#doneWishes").textContent = state.wishes.filter((wish) => wish.fulfilledAt).length;
  document.querySelector("#memoryCount").textContent = state.wishes.filter((wish) => (wish.diary || wish.memory || "").trim()).length;
}

function renderCategories() {
  categoryList.innerHTML = "";
  state.categories.forEach((category) => {
    const count = state.wishes.filter((wish) => wish.categoryId === category.id).length;
    const item = document.createElement("div");
    item.className = `category-item${category.id === state.activeCategoryId ? " active" : ""}`;
    item.style.setProperty("--category-color", category.color);
    item.innerHTML = `
      <button class="category-select" type="button">
        <span class="category-cover">
          <img src="${escapeAttribute(getCategoryCover(category))}" alt="" />
        </span>
        <span>
          <strong>${escapeHtml(category.name)}</strong>
          <small>${count} 个愿望</small>
        </span>
      </button>
      <span class="category-actions">
        <label class="mini-icon-button" title="修改封面">
          <span aria-hidden="true">图</span>
          <input class="category-cover-input" type="file" accept="image/*" />
        </label>
        <button class="mini-icon-button category-delete-button" type="button" title="删除分类" aria-label="删除分类">×</button>
      </span>
    `;
    item.querySelector(".category-select").addEventListener("click", () => {
      state.activeCategoryId = category.id;
      state.activeWishId = state.wishes.find((wish) => wish.categoryId === category.id)?.id ?? null;
      commit();
    });
    item.querySelector(".category-cover-input").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        category.cover = await resolveImageValue(file, getCategoryCover(category));
        commit("修改分类封面", "category", category.id);
        showBackupStatus(`“${category.name}”的封面已更新。`);
      } catch (error) {
        showBackupStatus(`分类封面上传失败：${error.message}`);
      }
    });
    item.querySelector(".category-delete-button").addEventListener("click", () => deleteCategory(category));
    categoryList.append(item);
  });
}

function deleteCategory(category) {
  if (state.categories.length <= 1) {
    showBackupStatus("至少保留一个分类，暂时不能删除最后一个分类。");
    return;
  }
  const count = state.wishes.filter((wish) => wish.categoryId === category.id).length;
  const message = count
    ? `删除“${category.name}”会同时删除其中的 ${count} 个愿望，确定继续吗？`
    : `确定删除“${category.name}”这个分类吗？`;
  if (!window.confirm(message)) return;
  recordHistory("删除分类（删除前版本）", "category", category.id);
  state.categories = state.categories.filter((item) => item.id !== category.id);
  state.wishes = state.wishes.filter((wish) => wish.categoryId !== category.id);
  if (state.activeCategoryId === category.id) {
    state.activeCategoryId = state.categories[0].id;
    state.activeWishId = state.wishes.find((wish) => wish.categoryId === state.activeCategoryId)?.id || null;
  }
  commit();
  showBackupStatus(`已删除“${category.name}”。`);
}

function renderWishes(wishes) {
  wishList.innerHTML = "";
  if (!wishes.length) {
    wishList.innerHTML = '<div class="empty-detail"><span>empty</span><p>这个分类还没有愿望，先收进一个小想法。</p></div>';
    return;
  }

  wishes.forEach((wish) => {
    const button = document.createElement("button");
    button.className = `wish-card${wish.id === state.activeWishId ? " active" : ""}${wish.fulfilledAt ? " done" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="wish-cover">
        <img src="${escapeAttribute(getWishCover(wish))}" alt="" />
      </span>
      <span class="wish-card-copy">
        <strong>${escapeHtml(wish.title)}</strong>
        <small>${escapeHtml(wish.note || "还没有备注")}</small>
        <span class="wish-meta">
          <span class="tag">${wish.fulfilledAt ? "已实现" : "想实现"}</span>
          <span class="tag priority">${escapeHtml(getWishPriority(wish))}</span>
          ${wish.wishAt ? `<span class="tag reminder">许愿于 ${escapeHtml(formatWishAt(wish.wishAt))}</span>` : ""}
          ${renderCountdownTag(wish)}
          <span class="tag">${wish.memory ? "有心得" : "待记录"}</span>
          ${wish.createdBy ? `<span class="tag person-tag">添加：${escapeHtml(wish.createdBy)}</span>` : ""}
          ${wish.preparedBy ? `<span class="tag person-tag">准备：${escapeHtml(wish.preparedBy)}</span>` : ""}
        </span>
      </span>
    `;
    button.addEventListener("click", () => {
      state.activeWishId = wish.id;
      commit();
    });
    wishList.append(button);
  });
}

function renderDetail() {
  const wish = state.wishes.find((item) => item.id === state.activeWishId);
  if (!wish) {
    detailPanel.innerHTML = '<div class="empty-detail"><span>select a wish</span><p>选中一个愿望，就可以记录实现的时间、照片和心得。</p></div>';
    return;
  }

  const privatePrepMarkup = currentSession
    ? `
      <label class="private-prep">
        <span>幕后准备区 · 仅你可见</span>
        <textarea data-field="privatePrep" placeholder="预算、链接、准备计划、惊喜步骤。">${escapeHtml(wish.privatePrep || "")}</textarea>
        <em>这段内容只会保存到当前登录账号，另一位账号无法读取。</em>
      </label>
    `
    : `
      <div class="private-prep private-locked">
        <span>幕后准备区</span>
        <p>登录后才能查看和编辑；内容只属于当前账号。</p>
      </div>
    `;

  const countdownMarkup = renderCountdown(wish);
  const prepChecklistMarkup = currentSession ? renderPrepChecklist(wish) : "";

    detailPanel.innerHTML = `
    <div class="detail-hero">
      <img src="${escapeAttribute(getWishCover(wish))}" alt="" />
      <div class="detail-title">
        <h2>${escapeHtml(wish.title)}</h2>
        <p>${wish.fulfilledAt ? `实现于 ${escapeHtml(wish.fulfilledAt)}` : "还在等待一个合适的时刻"}</p>
        <small>添加：${escapeHtml(wish.createdBy || "愿望箱成员")}${wish.preparedBy ? ` · 准备：${escapeHtml(wish.preparedBy)}` : ""}</small>
      </div>
    </div>
    <div class="field-stack">
      <label>
        <span>标题</span>
        <input data-field="title" value="${escapeAttribute(wish.title)}" maxlength="40" />
      </label>
      <label>
        <span>添加者</span>
        <input data-field="createdBy" value="${escapeAttribute(wish.createdBy || getCurrentProfileName())}" maxlength="16" placeholder="谁把这个愿望收进来了" />
      </label>
      <label>
        <span>准备者</span>
        <input data-field="preparedBy" value="${escapeAttribute(wish.preparedBy || getCurrentProfileName())}" maxlength="16" placeholder="谁在为它做准备" />
      </label>
      <label>
        <span>实现时间</span>
        <input data-field="fulfilledAt" type="date" value="${escapeAttribute(wish.fulfilledAt)}" />
      </label>
      <label>
        <span>许愿时间</span>
        <input data-field="wishAt" type="date" value="${escapeAttribute(wish.wishAt || "")}" />
      </label>
      <label>
        <span>计划实现时间</span>
        <input data-field="plannedAt" type="date" value="${escapeAttribute(wish.plannedAt || "")}" />
      </label>
      <label>
        <span>实现地点</span>
        <input data-field="placeName" value="${escapeAttribute(wish.placeName || "")}" placeholder="比如：杭州西湖边" />
      </label>
      <label>
        <span>地图链接</span>
        <input data-field="mapUrl" type="url" value="${escapeAttribute(wish.mapUrl || "")}" placeholder="粘贴地图链接" />
      </label>
      <label>
        <span>照片拍摄地点</span>
        <input data-field="photoLocation" value="${escapeAttribute(wish.photoLocation || "")}" placeholder="照片里的地点或角落" />
      </label>
      ${countdownMarkup}
      <label>
        <span>惦记程度</span>
        <select data-field="priority">
          ${renderPriorityOptions(getWishPriority(wish))}
        </select>
      </label>
      <label>
        <span>备注</span>
        <textarea data-field="note">${escapeHtml(wish.note)}</textarea>
      </label>
      <label>
        <span>心得</span>
        <textarea data-field="memory" placeholder="实现那天发生了什么，她笑了几次，你想记住什么。">${escapeHtml(wish.memory)}</textarea>
      </label>
      ${privatePrepMarkup}
      ${prepChecklistMarkup}
      <div class="cover-toolbar">
        <p class="cover-hint">这张图会作为愿望卡片缩略图和详情页封面。</p>
        <label class="upload-button">
          更换封面
          <input id="imageUpload" type="file" accept="image/*" />
        </label>
      </div>
      <div class="fulfill-toolbar">
        <div>
          <strong>${wish.fulfilledAt ? "这件愿望已经实现" : "实现这件愿望"}</strong>
          <span>${wish.fulfilledAt ? `实现于 ${escapeHtml(wish.fulfilledAt)} · ${escapeHtml(wish.fulfilledBy || "愿望箱成员")}` : "填写一张照片和一段文字，把它收进回忆册。"}</span>
        </div>
        ${wish.fulfilledAt ? `<button class="backup-button" id="markFulfilledButton" type="button">修改实现记录</button>` : `<button class="ink-button" id="markFulfilledButton" type="button">＋ 标记已实现</button>`}
      </div>
      <div class="wish-actions">
        <label>
          <span>移动到分类</span>
          <select id="moveWishCategory">${renderCategoryOptions(wish.categoryId)}</select>
        </label>
        <button class="backup-button" id="moveWishButton" type="button">移动愿望</button>
        <button class="danger-button" id="deleteWishButton" type="button">删除愿望</button>
      </div>
    </div>
  `;

  detailPanel.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      wish[event.target.dataset.field] = event.target.value;
      if (event.target.dataset.field === "privatePrep" && currentSession && !wish.preparedBy) {
        wish.preparedBy = getCurrentProfileName();
        wish.preparedById = currentSession.user.id;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      scheduleCloudSave();
      queueHistory("编辑愿望", "wish", wish.id);
      renderStats();
      if (event.target.dataset.field === "title") {
        detailPanel.querySelector(".detail-title h2").textContent = wish.title;
      }
      if (event.target.dataset.field === "fulfilledAt") {
        detailPanel.querySelector(".detail-title p").textContent = wish.fulfilledAt
          ? `实现于 ${wish.fulfilledAt}`
          : "还在等待一个合适的时刻";
      }
      if (event.target.dataset.field === "title" || event.target.dataset.field === "fulfilledAt" || event.target.dataset.field === "wishAt" || event.target.dataset.field === "createdBy" || event.target.dataset.field === "preparedBy") {
        renderWishes(state.wishes.filter((item) => item.categoryId === state.activeCategoryId));
        renderMemories();
        const credits = detailPanel.querySelector(".detail-title small");
        if (credits) {
          credits.textContent = `添加：${wish.createdBy || "愿望箱成员"}${wish.preparedBy ? ` · 准备：${wish.preparedBy}` : ""}`;
        }
      }
      if (
        event.target.dataset.field === "priority" ||
        event.target.dataset.field === "note" ||
        event.target.dataset.field === "memory" ||
        event.target.dataset.field === "privatePrep" ||
        event.target.dataset.field === "diary"
      ) {
        renderWishes(state.wishes.filter((item) => item.categoryId === state.activeCategoryId));
        renderMemories();
      }
    });
  });

  detailPanel.querySelector("#prepChecklistForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.target.elements.item;
    const text = input.value.trim();
    if (!text) return;
    wish.prepItems ||= [];
    wish.prepItems.push({ id: crypto.randomUUID(), text, done: false, completedBy: "", completedAt: "" });
    commit("新增准备事项", "wish", wish.id);
  });
  detailPanel.querySelector("#startPrepButton")?.addEventListener("click", () => {
    wish.prepStarted = true;
    commit("开始准备", "wish", wish.id);
  });
  detailPanel.querySelectorAll("[data-prep-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = wish.prepItems?.find((prep) => prep.id === button.dataset.prepToggle);
      if (!item) return;
      item.done = !item.done;
      item.completedBy = item.done ? getCurrentProfileName() : "";
      item.completedAt = item.done ? new Date().toISOString() : "";
      commit("更新准备事项", "wish", wish.id);
    });
  });
  detailPanel.querySelectorAll("[data-prep-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      wish.prepItems = (wish.prepItems || []).filter((prep) => prep.id !== button.dataset.prepDelete);
      commit("删除准备事项", "wish", wish.id);
    });
  });
  detailPanel.querySelectorAll("[data-prep-item]").forEach((item) => {
    item.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", item.dataset.prepItem));
    item.addEventListener("dragover", (event) => event.preventDefault());
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const fromId = event.dataTransfer.getData("text/plain");
      const from = wish.prepItems?.findIndex((prep) => prep.id === fromId);
      const to = wish.prepItems?.findIndex((prep) => prep.id === item.dataset.prepItem);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = wish.prepItems.splice(from, 1);
      wish.prepItems.splice(to, 0, moved);
      commit("调整准备事项顺序", "wish", wish.id);
    });
  });

  detailPanel.querySelector("#imageUpload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      wish.image = await resolveImageValue(file, wish.image || DEFAULT_COVER);
      commit("修改愿望封面", "wish", wish.id);
    } catch (error) {
      showBackupStatus(`封面上传失败：${error.message}`);
    }
  });

  detailPanel.querySelector("#markFulfilledButton")?.addEventListener("click", () => openFulfillDialog(wish));
  detailPanel.querySelector("#moveWishButton")?.addEventListener("click", () => {
    const targetCategoryId = detailPanel.querySelector("#moveWishCategory").value;
    moveWishToCategory(wish, targetCategoryId);
  });
  detailPanel.querySelector("#deleteWishButton")?.addEventListener("click", () => deleteWish(wish));
}

function renderCountdown(wish) {
  if (!wish.plannedAt || wish.fulfilledAt) return "";
  const target = new Date(`${wish.plannedAt}T00:00:00`);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const days = Math.round((targetStart - todayStart) / 86400000);
  if (days < 0) return `<div class="countdown overdue"><strong>别忘记实现！</strong><span>已超过 ${Math.abs(days)} 天</span></div>`;
  if (days === 0) return '<div class="countdown today"><strong>今天要实现！</strong><span>计划日期就是今天</span></div>';
  return `<div class="countdown"><strong>还有 ${days} 天</strong><span>计划于 ${escapeHtml(wish.plannedAt)} 实现</span></div>`;
}

function renderCountdownTag(wish) {
  if (!wish.plannedAt || wish.fulfilledAt) return "";
  const target = new Date(`${wish.plannedAt}T00:00:00`);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const days = Math.round((targetStart - todayStart) / 86400000);
  if (days < 0) return `<span class="tag countdown-tag overdue">别忘记实现！</span>`;
  if (days === 0) return '<span class="tag countdown-tag today">今天要实现！</span>';
  return `<span class="tag countdown-tag">还有 ${days} 天</span>`;
}

function renderPrepChecklist(wish) {
  const items = wish.prepItems || [];
  if (!wish.prepStarted) {
    return `
      <section class="prep-checklist prep-not-started" aria-label="准备事项">
        <div class="prep-checklist-head"><div><strong>幕后准备</strong><span>把这件愿望变成一个小计划。</span></div></div>
        <button class="ink-button" id="startPrepButton" type="button">开始准备</button>
      </section>
    `;
  }
  return `
    <section class="prep-checklist" aria-label="准备事项">
      <div class="prep-checklist-head">
        <div><strong>准备事项</strong><span>可以拖动调整顺序</span></div>
        <span>${items.filter((item) => item.done).length}/${items.length}</span>
      </div>
      <div class="prep-list">
        ${items.length ? items.map((item) => `
          <div class="prep-item${item.done ? " done" : ""}" draggable="true" data-prep-item="${escapeAttribute(item.id)}">
            <button type="button" class="prep-check" data-prep-toggle="${escapeAttribute(item.id)}" aria-label="${item.done ? "取消完成" : "标记完成"}">${item.done ? "✓" : ""}</button>
            <div><strong>${escapeHtml(item.text)}</strong>${item.done ? `<small>${escapeHtml(item.completedBy || "愿望箱成员")} · ${escapeHtml(formatCommentTime(item.completedAt))}</small>` : ""}</div>
            <button type="button" class="prep-delete" data-prep-delete="${escapeAttribute(item.id)}" aria-label="删除准备事项">×</button>
          </div>
        `).join("") : '<p class="prep-empty">还没有准备事项。</p>'}
      </div>
      <form class="prep-checklist-form" id="prepChecklistForm">
        <input name="item" maxlength="80" placeholder="添加一个准备事项" />
        <button class="backup-button" type="submit">添加</button>
      </form>
    </section>
  `;
}

function renderCategoryOptions(selectedId) {
  return state.categories
    .map((category) => `<option value="${escapeAttribute(category.id)}"${category.id === selectedId ? " selected" : ""}>${escapeHtml(category.name)}</option>`)
    .join("");
}

function moveWishToCategory(wish, categoryId) {
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category || wish.categoryId === categoryId) {
    showBackupStatus("这个愿望已经在当前分类里了。");
    return;
  }
  wish.categoryId = categoryId;
  state.activeCategoryId = categoryId;
  state.activeWishId = wish.id;
  commit("移动愿望", "wish", wish.id);
  showBackupStatus(`已把“${wish.title}”移动到“${category.name}”。`);
}

function deleteWish(wish) {
  if (!window.confirm(`确定删除“${wish.title}”这个愿望吗？删除后无法从愿望箱恢复。`)) return;
  recordHistory("删除愿望（删除前版本）", "wish", wish.id);
  state.wishes = state.wishes.filter((item) => item.id !== wish.id);
  state.activeWishId = state.wishes.find((item) => item.categoryId === state.activeCategoryId)?.id || null;
  commit();
  showBackupStatus(`已删除“${wish.title}”。`);
}

function openFulfillDialog(wish) {
  fulfillingWish = wish;
  document.querySelector("#fulfillDialogTitle").textContent = wish.fulfilledAt ? "修改这件小事的回忆" : "把这件小事收进回忆";
  fulfilledDateInput.value = wish.fulfilledAt || new Date().toISOString().slice(0, 10);
  fulfilledStoryInput.value = wish.diary || "";
  fulfilledPhotoInput.value = "";
  fulfilledPhotoPreview.src = wish.memoryImage || getWishCover(wish);
  if (typeof fulfillDialog.showModal === "function") {
    fulfillDialog.showModal();
  } else {
    fulfillDialog.setAttribute("open", "");
  }
  fulfilledStoryInput.focus();
}

function closeFulfillDialog() {
  fulfillingWish = null;
  fulfillForm.reset();
  if (fulfillDialog.open) fulfillDialog.close();
  else fulfillDialog.removeAttribute("open");
}

function previewFulfilledPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    fulfilledPhotoPreview.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function submitFulfilledWish(event) {
  event.preventDefault();
  if (!fulfillingWish) return;
  const wish = fulfillingWish;
  const wasFulfilled = Boolean(wish.fulfilledAt);
  const submitButton = fulfillForm.querySelector("button[type='submit']");
  const story = fulfilledStoryInput.value.trim();
  if (!story) return;
  submitButton.disabled = true;
  try {
    const photoFile = fulfilledPhotoInput.files?.[0];
    const memoryImage = photoFile
      ? await resolveImageValue(photoFile, wish.memoryImage || getWishCover(wish))
      : wish.memoryImage || getWishCover(wish);
    wish.fulfilledAt = fulfilledDateInput.value;
    wish.diary = story;
    wish.memoryImage = memoryImage;
    wish.fulfilledBy = getCurrentProfileName();
    wish.revealedPrep = wish.privatePrep || wish.revealedPrep || "";
    if (wish.revealedPrep && !wish.preparedBy) {
      wish.preparedBy = getCurrentProfileName();
      wish.preparedById = currentSession?.user?.id || "";
    }
    state.activeView = "memories";
    closeFulfillDialog();
    commit(wasFulfilled ? "修改实现记录" : "完成愿望", "wish", wish.id);
    showBackupStatus("这件愿望已实现，照片、故事和幕后回顾都收进回忆册了。");
  } catch (error) {
    showBackupStatus(`回忆保存失败：${error.message}`);
  } finally {
    submitButton.disabled = false;
  }
}

function showWishForm() {
  const template = document.querySelector("#wishFormTemplate");
  detailPanel.replaceChildren(template.content.cloneNode(true));
  const form = detailPanel.querySelector("#wishEditor");
  const coverInput = form.querySelector("#newWishCover");
  const coverPreview = form.querySelector("#newWishCoverPreview");
  let selectedCover = DEFAULT_COVER;

  coverInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      selectedCover = DEFAULT_COVER;
      coverPreview.src = DEFAULT_COVER;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      selectedCover = reader.result;
      coverPreview.src = selectedCover;
    };
    reader.readAsDataURL(file);
  });

  form.querySelector("input").focus();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    let image = selectedCover;
    try {
      const coverFile = coverInput.files?.[0];
      if (coverFile) image = await resolveImageValue(coverFile, selectedCover);
    } catch (error) {
      showBackupStatus(`愿望封面上传失败：${error.message}`);
    } finally {
      submitButton.disabled = false;
    }
    const wish = {
      id: crypto.randomUUID(),
      categoryId: state.activeCategoryId,
      title: data.get("title").trim(),
      note: data.get("note").trim(),
      fulfilledAt: data.get("fulfilledAt"),
      wishAt: data.get("wishAt"),
      plannedAt: "",
      privatePrep: data.get("privatePrep").trim(),
      diary: "",
      priority: data.get("priority") || "最近惦记",
      memory: "",
      createdBy: getCurrentProfileName(),
      createdById: currentSession?.user?.id || "",
      preparedBy: getCurrentProfileName(),
      preparedById: currentSession?.user?.id || "",
      revealedPrep: "",
      memoryImage: "",
      fulfilledBy: "",
      placeName: "",
      mapUrl: "",
      photoLocation: "",
      prepItems: [],
      prepStarted: false,
      comments: [],
      image,
    };
    if (!wish.title) return;
    state.wishes.unshift(wish);
    state.activeWishId = wish.id;
    commit("新增愿望", "wish", wish.id);
  });
}

async function resolveImageValue(file, fallback) {
  const user = await getCloudUser();
  if (!user) return fileToDataUrl(file);
  try {
    return await uploadImageToCloud(file, user);
  } catch (error) {
    showBackupStatus("云端图片暂时不可用，已保留本地图片；请确认已创建 wish-images 存储桶。" );
    try {
      return await fileToDataUrl(file);
    } catch {
      return fallback || "";
    }
  }
}

async function uploadImageToCloud(file, user) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("无法读取图片"));
    reader.readAsDataURL(file);
  });
}

function getWishCover(wish) {
  return wish.image || DEFAULT_COVER;
}

function getCategoryCover(category) {
  return category.cover || DEFAULT_CATEGORY_COVER;
}

function getWishPriority(wish) {
  return PRIORITIES.includes(wish.priority) ? wish.priority : "最近惦记";
}

function renderPriorityOptions(selected) {
  return PRIORITIES.map(
    (priority) => `<option value="${escapeAttribute(priority)}"${priority === selected ? " selected" : ""}>${escapeHtml(priority)}</option>`,
  ).join("");
}

function renderMemories() {
  const doneWishes = state.wishes
    .filter((wish) => wish.fulfilledAt)
    .sort((a, b) => {
      const diff = new Date(`${a.fulfilledAt}T00:00:00`) - new Date(`${b.fulfilledAt}T00:00:00`);
      return memorySortOrder === "asc" ? diff : -diff;
    });
  updateMemorySortButton();
  if (!doneWishes.length) {
    memoryList.innerHTML =
      '<div class="empty-detail memory-empty"><span>memory book</span><p>实现过的愿望会自动来到这里，等第一篇小日记被收进来。</p></div>';
    return;
  }

  memoryList.innerHTML = "";
  doneWishes.forEach((wish) => {
    const category = state.categories.find((item) => item.id === wish.categoryId);
    const article = document.createElement("article");
    article.className = "memory-card";
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute("aria-label", `查看回忆：${wish.title}`);
    article.innerHTML = `
      <img src="${escapeAttribute(wish.memoryImage || getWishCover(wish))}" alt="" />
      <div class="memory-card-body">
        <strong class="memory-card-title">${escapeHtml(wish.title)}</strong>
        <span class="memory-days">实现第 ${getFulfilledDayCount(wish.fulfilledAt)} 天</span>
        <div class="memory-card-sections">
          ${renderMemoryCardSection("照片故事", wish.diary)}
          ${renderMemoryCardSection("心得", wish.memory && wish.memory !== wish.diary ? wish.memory : "")}
          ${renderMemoryCardSection("幕后回顾", wish.revealedPrep)}
          ${!wish.diary && !wish.memory && !wish.revealedPrep ? renderMemoryCardSection("这一天", wish.note || "这一天已经被收进回忆册。") : ""}
        </div>
        <span class="wish-meta">
          <span class="tag">${escapeHtml(category?.name ?? "未分类")}</span>
          <span class="tag">${escapeHtml(wish.fulfilledAt)}</span>
          <span class="tag priority">${escapeHtml(getWishPriority(wish))}</span>
          ${wish.createdBy ? `<span class="tag person-tag">添加：${escapeHtml(wish.createdBy)}</span>` : ""}
          ${wish.preparedBy ? `<span class="tag person-tag">准备：${escapeHtml(wish.preparedBy)}</span>` : ""}
          ${wish.fulfilledBy ? `<span class="tag person-tag">实现：${escapeHtml(wish.fulfilledBy)}</span>` : ""}
          ${wish.wishAt ? `<span class="tag reminder">许愿于 ${escapeHtml(formatWishAt(wish.wishAt))}</span>` : ""}
          ${wish.comments?.length ? `<span class="tag">${wish.comments.length} 条评论</span>` : ""}
        </span>
      </div>
    `;
    article.addEventListener("click", () => openMemoryDetail(wish));
    article.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openMemoryDetail(wish);
    });
    memoryList.append(article);
  });
}

function updateMemorySortButton() {
  if (memorySortButton) memorySortButton.textContent = memorySortOrder === "desc" ? "最新在前 ↓" : "最早在前 ↑";
}

function drawTodayWish() {
  const candidateCategories = state.categories.filter((category) => ["美食", "日常"].includes(category.name));
  const candidates = state.wishes.filter(
    (wish) => !wish.fulfilledAt && candidateCategories.some((category) => category.id === wish.categoryId),
  );
  if (!candidates.length) {
    showBackupStatus("还没有可抽取的愿望，可以先添加一个美食或日常愿望。");
    setActiveView("categories");
    showWishForm();
    return;
  }
  const wish = candidates[Math.floor(Math.random() * candidates.length)];
  state.activeCategoryId = wish.categoryId;
  state.activeWishId = wish.id;
  state.activeView = "categories";
  commit();
  window.setTimeout(() => wishList.querySelector(".wish-card.active")?.classList.add("draw-reveal"), 0);
  showBackupStatus(`抽中了“${wish.title}”，开始准备吧！`);
}

function renderMemoryCardSection(label, content) {
  if (!content) return "";
  return `
    <section class="memory-card-section">
      <h3>${escapeHtml(label)}</h3>
      <p>${escapeHtml(content)}</p>
    </section>
  `;
}

function openMemoryDetail(wish) {
  activeMemoryWishId = wish.id;
  const category = state.categories.find((item) => item.id === wish.categoryId);
  memoryDetailContent.innerHTML = `
    <div class="memory-detail-head">
      <div>
        <h2 id="memoryDetailTitle">${escapeHtml(wish.title)}</h2>
        <p>${escapeHtml(category?.name ?? "未分类")} · 实现于 ${escapeHtml(wish.fulfilledAt || "未记录日期")} · <strong>第 ${getFulfilledDayCount(wish.fulfilledAt)} 天</strong></p>
      </div>
      <button class="dialog-close" type="button" data-close-memory aria-label="关闭回忆详情">×</button>
    </div>
    <img class="memory-detail-image" src="${escapeAttribute(wish.memoryImage || getWishCover(wish))}" alt="${escapeAttribute(wish.title)}的回忆照片" />
    <div class="memory-detail-sections">
      ${renderMemoryDetailSection("最初的愿望", wish.note)}
      ${renderMemoryDetailSection("照片故事", wish.diary)}
      ${renderMemoryDetailSection("心得", wish.memory && wish.memory !== wish.diary ? wish.memory : "")}
      ${renderMemoryDetailSection("幕后回顾", wish.revealedPrep)}
    </div>
    <div class="memory-detail-meta">
      <span>${escapeHtml(getWishPriority(wish))}</span>
      ${wish.wishAt ? `<span>许愿于 ${escapeHtml(formatWishAt(wish.wishAt))}</span>` : ""}
      ${wish.createdBy ? `<span>添加：${escapeHtml(wish.createdBy)}</span>` : ""}
      ${wish.preparedBy ? `<span>准备：${escapeHtml(wish.preparedBy)}</span>` : ""}
      ${wish.fulfilledBy ? `<span>实现：${escapeHtml(wish.fulfilledBy)}</span>` : ""}
    </div>
    <section class="memory-comments" aria-labelledby="memoryCommentsTitle">
      <div class="memory-comments-head">
        <h3 id="memoryCommentsTitle">一起留下的话</h3>
        <span>${wish.comments?.length || 0} 条评论</span>
      </div>
      <div class="memory-comment-list">
        ${renderMemoryComments(wish.comments)}
      </div>
      <form class="memory-comment-form">
        <label for="memoryCommentInput">写下一句话</label>
        <div>
          <textarea id="memoryCommentInput" name="comment" maxlength="300" placeholder="关于这一天，你还想记住什么？" required></textarea>
          <button class="ink-button" type="submit">发表评论</button>
        </div>
        <p>将以“${escapeHtml(getCurrentProfileName())}”的名字留下。</p>
      </form>
    </section>
  `;
  if (!memoryDetailDialog.open) memoryDetailDialog.showModal();
}

function renderMemoryDetailSection(label, content) {
  if (!content) return "";
  return `
    <section>
      <h3>${escapeHtml(label)}</h3>
      <p>${escapeHtml(content)}</p>
    </section>
  `;
}

function renderMemoryComments(comments = []) {
  if (!comments.length) return '<p class="memory-comments-empty">还没有评论，先留下第一句话吧。</p>';
  return comments
    .map(
      (comment) => `
        <article class="memory-comment">
          <div>
            <strong>（${escapeHtml(comment.author || "愿望箱成员")}）说</strong>
            <time datetime="${escapeAttribute(comment.createdAt || "")}">${escapeHtml(formatCommentTime(comment.createdAt))}</time>
          </div>
          <p>${escapeHtml(comment.text || "")}</p>
        </article>
      `,
    )
    .join("");
}

function submitMemoryComment(event) {
  if (!event.target.matches(".memory-comment-form")) return;
  event.preventDefault();
  const wish = state.wishes.find((item) => item.id === activeMemoryWishId && item.fulfilledAt);
  const input = event.target.elements.comment;
  const text = input.value.trim();
  if (!wish || !text) return;
  wish.comments ||= [];
  wish.comments.push({
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: getCurrentProfileName(),
    authorId: currentSession?.user?.id || "",
    text,
    createdAt: new Date().toISOString(),
  });
  commit("发表评论", "wish", wish.id);
  openMemoryDetail(wish);
  showBackupStatus("评论已经留在这篇回忆里了。");
  window.setTimeout(() => memoryDetailContent.querySelector("#memoryCommentInput")?.focus(), 0);
}

function formatCommentTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getFulfilledDayCount(value) {
  if (!value) return 1;
  const fulfilled = new Date(`${value}T00:00:00`);
  if (Number.isNaN(fulfilled.getTime())) return 1;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const fulfilledStart = new Date(fulfilled.getFullYear(), fulfilled.getMonth(), fulfilled.getDate());
  const elapsed = Math.floor((todayStart - fulfilledStart) / 86400000);
  return Math.max(1, elapsed + 1);
}

function setActiveView(view) {
  state.activeView = view;
  commit();
}

function renderView() {
  const showMemories = state.activeView === "memories";
  const activeCategory = state.categories.find((category) => category.id === state.activeCategoryId);
  board.classList.toggle("hidden", showMemories);
  memoryBoard.classList.toggle("hidden", !showMemories);
  categoryViewButton.classList.toggle("active", !showMemories);
  memoryViewButton.classList.toggle("active", showMemories);
  activeCategoryTitle.textContent = showMemories ? "回忆册" : activeCategory?.name ?? "未分类";
}

function normalizeState(nextState) {
  const normalized = structuredClone(seedState);
  normalized.activeCategoryId = nextState.activeCategoryId || seedState.activeCategoryId;
  normalized.activeWishId = nextState.activeWishId || seedState.activeWishId;
  normalized.activeView = nextState.activeView || "categories";
  normalized.anniversaries = Array.isArray(nextState.anniversaries)
    ? nextState.anniversaries.map((item) => ({
        id: item.id || crypto.randomUUID(),
        name: item.name || "未命名纪念日",
        date: item.date || "",
        photo: item.photo || "",
      }))
    : [];
  normalized.categories = (nextState.categories || seedState.categories).map((category, index) => ({
    ...category,
    color: category.color || ["#1640df", "#6f8d5f", "#b06b45", "#2f2923"][index % 4],
    cover: category.cover || seedState.categories[index]?.cover || DEFAULT_CATEGORY_COVER,
  }));
  normalized.wishes = (nextState.wishes || seedState.wishes).map((wish) => ({
    ...wish,
    priority: PRIORITIES.includes(wish.priority) ? wish.priority : "最近惦记",
    image: wish.image || DEFAULT_COVER,
    wishAt: wish.wishAt || wish.reminderAt || "",
    plannedAt: wish.plannedAt || "",
    privatePrep: wish.privatePrep || "",
    diary: wish.diary || "",
    createdBy: wish.createdBy || "最初的愿望收集者",
    createdById: wish.createdById || "",
    preparedBy: wish.preparedBy || "",
    preparedById: wish.preparedById || "",
    revealedPrep: wish.revealedPrep || "",
    memoryImage: wish.memoryImage || "",
    fulfilledBy: wish.fulfilledBy || "",
    placeName: wish.placeName || "",
    mapUrl: wish.mapUrl || "",
    photoLocation: wish.photoLocation || "",
    prepItems: Array.isArray(wish.prepItems)
      ? wish.prepItems.map((item) => ({
          id: item.id || crypto.randomUUID(),
          text: item.text || "",
          done: Boolean(item.done),
          completedBy: item.completedBy || "",
          completedAt: item.completedAt || "",
        }))
      : [],
    prepStarted: Boolean(wish.prepStarted || (wish.prepItems || []).length),
    comments: Array.isArray(wish.comments)
      ? wish.comments.map((comment) => ({
          id: comment.id || `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          author: comment.author || "愿望箱成员",
          authorId: comment.authorId || "",
          text: comment.text || "",
          createdAt: comment.createdAt || "",
        }))
      : [],
  }));
  return normalized;
}

function getWishStory(wish) {
  const stories = [];
  if (wish.diary) stories.push(`照片故事：${wish.diary}`);
  if (wish.memory && wish.memory !== wish.diary) stories.push(`心得：${wish.memory}`);
  if (wish.revealedPrep) stories.push(`幕后回顾：${wish.revealedPrep}`);
  return stories.join("\n\n") || wish.note || "";
}

function formatWishAt(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(date);
}

function showBackupStatus(message) {
  backupStatus.textContent = message;
  window.clearTimeout(showBackupStatus.timer);
  showBackupStatus.timer = window.setTimeout(() => {
    backupStatus.textContent = "";
  }, 5200);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

render();
