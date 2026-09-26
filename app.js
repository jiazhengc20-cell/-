const STORAGE_KEY = "wish-atelier-state-v3";
const DEFAULT_COVER = "outputs/05-sip-wood-hush-zine.png";
const DEFAULT_CATEGORY_COVER = "outputs/08-wrapped-light-bouquet-zine.png";
const PRIORITIES = ["小小念头", "最近惦记", "非常想实现", "值得认真准备"];

const seedState = {
  activeCategoryId: "travel",
  activeWishId: "wish-1",
  activeView: "categories",
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
      reminderAt: "",
      privatePrep: "想找一家不用赶路的海边民宿，提前查一下日出时间。",
      diary: "",
      priority: "最近惦记",
      memory: "准备挑一个不用赶行程的周末，只做散步、拍照、喝热的东西。",
      image: "outputs/06-slow-window-light-zine.png",
    },
    {
      id: "wish-2",
      categoryId: "food",
      title: "找一家窗边的抹茶店",
      note: "有木窗、书架、光线慢一点，最好能坐很久。",
      fulfilledAt: "2026-08-30",
      reminderAt: "",
      privatePrep: "提前挑窗边位置，记得避开太吵的时段。",
      diary: "那天阳光靠在窗框上，抹茶的冰块慢慢化开。她说这个绿色很像夏天快结束的时候，于是这件小事就被收进来了。",
      priority: "非常想实现",
      memory: "那天她一直盯着杯子里的冰块，说这个绿色很像夏天快结束的时候。",
      image: "outputs/02-glass-light-stillness-zine.png",
    },
    {
      id: "wish-3",
      categoryId: "gift",
      title: "送一本写满批注的书",
      note: "不是贵重礼物，是把想说的话夹在页边。",
      fulfilledAt: "",
      reminderAt: "2026-10-01",
      privatePrep: "可以先选一本她最近会喜欢的书，把想说的话写在便签里。",
      diary: "",
      priority: "小小念头",
      memory: "",
      image: "outputs/04-between-pages-zine.png",
    },
  ],
};

let state = loadState();

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
const exportProgressButton = document.querySelector("#exportProgressButton");
const importProgressButton = document.querySelector("#importProgressButton");
const cloudProgressButton = document.querySelector("#cloudProgressButton");
const importProgressFile = document.querySelector("#importProgressFile");
const backupStatus = document.querySelector("#backupStatus");

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
exportProgressButton.addEventListener("click", () => exportProgress());
importProgressButton.addEventListener("click", () => importProgressFile.click());
cloudProgressButton.addEventListener("click", saveProgressForCloud);
importProgressFile.addEventListener("change", importProgress);

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

categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = categoryName.value.trim();
  if (!name) return;
  const category = {
    id: crypto.randomUUID(),
    name,
    color: categoryColor.value || ["#1640df", "#6f8d5f", "#b06b45", "#2f2923"][state.categories.length % 4],
    cover: pendingCategoryCover,
  };
  state.categories.push(category);
  state.activeCategoryId = category.id;
  state.activeWishId = null;
  categoryName.value = "";
  categoryColor.value = "#1640df";
  categoryCover.value = "";
  pendingCategoryCover = DEFAULT_CATEGORY_COVER;
  categoryForm.classList.add("hidden");
  commit();
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

function commit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
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
      commit();
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
  exportProgress("已生成云端备份文件；把它保存到 OneDrive、iCloud 或网盘同步文件夹，就能跨设备保留进度。");
}

function render() {
  const visibleWishes = state.wishes.filter((wish) => wish.categoryId === state.activeCategoryId);
  if (!visibleWishes.some((wish) => wish.id === state.activeWishId)) {
    state.activeWishId = visibleWishes[0]?.id || null;
  }

  renderView();
  renderStats();
  renderCategories();
  renderWishes(visibleWishes);
  renderDetail();
  renderMemories();
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
    const button = document.createElement("button");
    button.className = `category-item${category.id === state.activeCategoryId ? " active" : ""}`;
    button.type = "button";
    button.style.setProperty("--category-color", category.color);
    button.innerHTML = `
      <span class="category-cover">
        <img src="${escapeAttribute(getCategoryCover(category))}" alt="" />
      </span>
      <span>
        <strong>${escapeHtml(category.name)}</strong>
        <small>${count} 个愿望</small>
      </span>
    `;
    button.addEventListener("click", () => {
      state.activeCategoryId = category.id;
      state.activeWishId = state.wishes.find((wish) => wish.categoryId === category.id)?.id ?? null;
      commit();
    });
    categoryList.append(button);
  });
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
          ${wish.reminderAt ? `<span class="tag reminder">${escapeHtml(formatReminder(wish.reminderAt))}</span>` : ""}
          <span class="tag">${wish.memory ? "有心得" : "待记录"}</span>
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

    detailPanel.innerHTML = `
    <div class="detail-hero">
      <img src="${escapeAttribute(getWishCover(wish))}" alt="" />
      <div class="detail-title">
        <h2>${escapeHtml(wish.title)}</h2>
        <p>${wish.fulfilledAt ? `实现于 ${escapeHtml(wish.fulfilledAt)}` : "还在等待一个合适的时刻"}</p>
      </div>
    </div>
    <div class="field-stack">
      <label>
        <span>标题</span>
        <input data-field="title" value="${escapeAttribute(wish.title)}" maxlength="40" />
      </label>
      <label>
        <span>实现时间</span>
        <input data-field="fulfilledAt" type="date" value="${escapeAttribute(wish.fulfilledAt)}" />
      </label>
      <label>
        <span>提醒时间</span>
        <input data-field="reminderAt" type="date" value="${escapeAttribute(wish.reminderAt || "")}" />
      </label>
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
      <label class="private-prep">
        <span>私密准备区</span>
        <textarea data-field="privatePrep" placeholder="实现前只给你看：预算、链接、准备计划、惊喜步骤。">${escapeHtml(wish.privatePrep || "")}</textarea>
        <em>${wish.fulfilledAt ? "已实现后，这里可以作为回忆日记的素材。" : "实现前默认不进入回忆册，也不作为公开内容展示。"}</em>
      </label>
      <label class="diary-field">
        <span>实现后的照片 + 文字故事</span>
        <textarea data-field="diary" placeholder="实现后写成一篇小小日记，回忆册会优先展示这里。">${escapeHtml(wish.diary || "")}</textarea>
      </label>
      <div class="cover-toolbar">
        <p class="cover-hint">这张图会作为愿望卡片缩略图和详情页封面。</p>
        <label class="upload-button">
          更换封面
          <input id="imageUpload" type="file" accept="image/*" />
        </label>
      </div>
    </div>
  `;

  detailPanel.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      wish[event.target.dataset.field] = event.target.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderStats();
      if (event.target.dataset.field === "title") {
        detailPanel.querySelector(".detail-title h2").textContent = wish.title;
      }
      if (event.target.dataset.field === "fulfilledAt") {
        detailPanel.querySelector(".detail-title p").textContent = wish.fulfilledAt
          ? `实现于 ${wish.fulfilledAt}`
          : "还在等待一个合适的时刻";
      }
      if (event.target.dataset.field === "title" || event.target.dataset.field === "fulfilledAt" || event.target.dataset.field === "reminderAt") {
        renderWishes(state.wishes.filter((item) => item.categoryId === state.activeCategoryId));
        renderMemories();
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

  detailPanel.querySelector("#imageUpload").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      wish.image = reader.result;
      commit();
    };
    reader.readAsDataURL(file);
  });
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
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const wish = {
      id: crypto.randomUUID(),
      categoryId: state.activeCategoryId,
      title: data.get("title").trim(),
      note: data.get("note").trim(),
      fulfilledAt: data.get("fulfilledAt"),
      reminderAt: data.get("reminderAt"),
      privatePrep: data.get("privatePrep").trim(),
      diary: "",
      priority: data.get("priority") || "最近惦记",
      memory: "",
      image: selectedCover,
    };
    if (!wish.title) return;
    state.wishes.unshift(wish);
    state.activeWishId = wish.id;
    commit();
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
  const doneWishes = state.wishes.filter((wish) => wish.fulfilledAt);
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
    article.innerHTML = `
      <img src="${escapeAttribute(getWishCover(wish))}" alt="" />
      <div class="memory-card-body">
        <strong>${escapeHtml(wish.title)}</strong>
        <p>${escapeHtml(getWishStory(wish) || "这一天已经被收进回忆册。")}</p>
        <span class="wish-meta">
          <span class="tag">${escapeHtml(category?.name ?? "未分类")}</span>
          <span class="tag">${escapeHtml(wish.fulfilledAt)}</span>
          <span class="tag priority">${escapeHtml(getWishPriority(wish))}</span>
          ${wish.reminderAt ? `<span class="tag reminder">曾提醒 ${escapeHtml(formatReminder(wish.reminderAt))}</span>` : ""}
        </span>
      </div>
    `;
    memoryList.append(article);
  });
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
  normalized.categories = (nextState.categories || seedState.categories).map((category, index) => ({
    ...category,
    color: category.color || ["#1640df", "#6f8d5f", "#b06b45", "#2f2923"][index % 4],
    cover: category.cover || seedState.categories[index]?.cover || DEFAULT_CATEGORY_COVER,
  }));
  normalized.wishes = (nextState.wishes || seedState.wishes).map((wish) => ({
    ...wish,
    priority: PRIORITIES.includes(wish.priority) ? wish.priority : "最近惦记",
    image: wish.image || DEFAULT_COVER,
    reminderAt: wish.reminderAt || "",
    privatePrep: wish.privatePrep || "",
    diary: wish.diary || "",
  }));
  return normalized;
}

function getWishStory(wish) {
  return wish.diary || wish.memory || wish.note || "";
}

function formatReminder(value) {
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
