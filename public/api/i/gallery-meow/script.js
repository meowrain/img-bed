let allImages = [];
let visibleImages = [];
let currentIndex = 0;
let imageObserver = null;
const expandedYears = new Set();

const monthNames = {
	"01": "一月",
	"02": "二月",
	"03": "三月",
	"04": "四月",
	"05": "五月",
	"06": "六月",
	"07": "七月",
	"08": "八月",
	"09": "九月",
	10: "十月",
	11: "十一月",
	12: "十二月",
};

// 初始化懒加载观察器
function initLazyLoading() {
	if (imageObserver) return;

	imageObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const img = entry.target;
					const src = img.dataset.src;
					if (src) {
						img.src = src;
						img.classList.add("loaded");
						imageObserver.unobserve(img);
					}
				}
			});
		},
		{
			rootMargin: "50px 0px",
			threshold: 0.1,
		},
	);
}

// 观察图片元素
function observeImage(img) {
	if (imageObserver) {
		imageObserver.observe(img);
	}
}

async function discoverImages() {
	const loading = document.getElementById("loading");
	const progressText = document.getElementById("loadingProgress");
	const content = document.getElementById("content");

	try {
		progressText.textContent = "正在加载图片列表...";
		const response = await fetch("/api/i/images.json");
		if (!response.ok) throw new Error("Failed to load images.json");

		allImages = await response.json();

		// Sort by date descending
		allImages.sort((a, b) => b.date.localeCompare(a.date));

		loading.classList.add("hidden");
		content.classList.remove("hidden");

		document.getElementById("totalCount").textContent =
			allImages.length.toLocaleString();

		const _years = [...new Set(allImages.map((img) => img.year))];
		document.getElementById("yearCount").textContent = _years.length;

		const months = [
			...new Set(allImages.map((img) => `${img.year}-${img.month}`)),
		];
		document.getElementById("monthCount").textContent = months.length;

		populateFilters();

		// 初始化懒加载
		initLazyLoading();

		// 默认只展开最近的年份
		const years = [...new Set(allImages.map((img) => img.year))]
			.sort()
			.reverse();
		if (years.length > 0) {
			expandedYears.add(years[0]); // 展开最新年份
		}
		renderGallery();
	} catch (error) {
		console.error("Error loading gallery:", error);
		progressText.textContent = "加载失败，请检查网络或稍后重试";
		progressText.style.color = "#ef4444";
	}
}

function populateFilters() {
	const years = [...new Set(allImages.map((img) => img.year))].sort().reverse();
	const yearSelect = document.getElementById("yearFilter");

	years.forEach((year) => {
		const option = document.createElement("option");
		option.value = year;
		option.textContent = `${year}年`;
		yearSelect.appendChild(option);
	});

	updateMonthFilter();
	document
		.getElementById("yearFilter")
		.addEventListener("change", updateMonthFilter);
}

function updateMonthFilter() {
	const year = document.getElementById("yearFilter").value;
	const monthSelect = document.getElementById("monthFilter");

	monthSelect.innerHTML = '<option value="">全部月份</option>';

	if (year) {
		const months = [
			...new Set(
				allImages.filter((img) => img.year === year).map((img) => img.month),
			),
		].sort();

		months.forEach((month) => {
			const option = document.createElement("option");
			option.value = month;
			option.textContent = `${Number.parseInt(month)}月`;
			monthSelect.appendChild(option);
		});
	}

	filterGallery();
}

function filterGallery() {
	const year = document.getElementById("yearFilter").value;
	const month = document.getElementById("monthFilter").value;
	const search = document.getElementById("searchInput").value.toLowerCase();

	visibleImages = allImages.filter((img) => {
		if (year && img.year !== year) return false;
		if (month && img.month !== month) return false;
		if (search && !img.filename.toLowerCase().includes(search)) return false;
		return true;
	});

	renderGallery();
}

function renderGallery() {
	const timeline = document.getElementById("timeline");
	timeline.innerHTML = "";

	if (visibleImages.length === 0) {
		timeline.innerHTML =
			'<div style="text-align: center; padding: 4rem; color: var(--text-gray);">没有找到匹配的图片</div>';
		return;
	}

	const byYear = {};
	visibleImages.forEach((img) => {
		if (!byYear[img.year]) byYear[img.year] = {};
		if (!byYear[img.year][img.month]) byYear[img.year][img.month] = [];
		byYear[img.year][img.month].push(img);
	});

	Object.keys(byYear)
		.sort()
		.reverse()
		.forEach((year) => {
			const yearEl = document.createElement("div");
			yearEl.className = "timeline-year";
			yearEl.dataset.year = year;

			const yearCount = Object.values(byYear[year]).reduce(
				(sum, imgs) => sum + imgs.length,
				0,
			);

			const isExpanded = expandedYears.has(year);
			const toggleIcon = isExpanded ? "▼" : "▶";

			yearEl.innerHTML = `
            <div class="timeline-year-marker">${year.slice(-2)}</div>
			<div class="timeline-year-header">
                <h2>${year}年</h2>
                <span class="count">${yearCount} 张照片</span>
                <span class="toggle-icon">${toggleIcon}</span>
            </div>
        `;

			const yearHeader = yearEl.querySelector(".timeline-year-header");
			yearHeader?.addEventListener("click", () => toggleYear(year));

			if (isExpanded) {
				Object.keys(byYear[year])
					.sort()
					.reverse()
					.forEach((month) => {
						const monthImages = byYear[year][month];
						const monthEl = document.createElement("div");
						monthEl.className = "month-group";
						monthEl.dataset.month = month;

						monthEl.innerHTML = `
                    <div class="month-header">
                        <span class="icon">📆</span>
                        <span>${monthNames[month] || `${month}月`}</span>
                        <span style="color: var(--text-gray); font-size: 0.875rem;">(${monthImages.length} 张)</span>
                    </div>
                    <div class="gallery-masonry"></div>
                `;

						const masonry = monthEl.querySelector(".gallery-masonry");
						monthImages.forEach((img) => {
							const card = document.createElement("div");
							card.className = "image-card";
							card.dataset.filename = img.filename;
							card.dataset.date = img.date;
							card.onclick = () => openLightbox(img);

							// 创建包装器
							const wrapper = document.createElement("div");
							wrapper.className = "wrapper";

							// 创建占位符
							const placeholder = document.createElement("div");
							placeholder.className = "image-placeholder";
							placeholder.innerHTML = "📷";

							// 创建图片元素（懒加载）
							const imgElement = document.createElement("img");
							imgElement.dataset.src = img.url;
							imgElement.alt = img.filename;
							imgElement.className = "lazy-image";

							imgElement.onload = () => {
								placeholder.style.display = "none";
								imgElement.classList.add("loaded");
							};

							imgElement.onerror = () => {
								placeholder.innerHTML = "❌";
							};

							observeImage(imgElement);

							// 创建覆盖层
							const overlay = document.createElement("div");
							overlay.className = "overlay";
							overlay.innerHTML = '<span class="icon">🔍</span>';

							// 组装包装器
							wrapper.appendChild(placeholder);
							wrapper.appendChild(imgElement);
							wrapper.appendChild(overlay);

							// 创建信息区域
							const info = document.createElement("div");
							info.className = "info";
							info.innerHTML = `
								<div class="filename" title="${img.filename}">${img.filename}</div>
								<div class="date">${img.date}</div>
							`;

							// 组装卡片
							card.appendChild(wrapper);
							card.appendChild(info);

							masonry.appendChild(card);
						});

						yearEl.appendChild(monthEl);
					});
			}

			timeline.appendChild(yearEl);
		});
}

// 切换年份展开/折叠
function toggleYear(year) {
	if (expandedYears.has(year)) {
		expandedYears.delete(year);
	} else {
		expandedYears.add(year);
	}
	renderGallery();
}

function openLightbox(img) {
	const lightbox = document.getElementById("lightbox");
	document.getElementById("lightboxImage").src = img.url;
	document.getElementById("lightboxFilename").textContent = img.filename;
	document.getElementById("lightboxMeta").textContent = img.date;

	currentIndex = visibleImages.indexOf(img);
	lightbox.classList.add("active");
}

function closeLightbox() {
	document.getElementById("lightbox").classList.remove("active");
}

function navigateImage(direction) {
	currentIndex += direction;
	if (currentIndex < 0) currentIndex = visibleImages.length - 1;
	if (currentIndex >= visibleImages.length) currentIndex = 0;

	const img = visibleImages[currentIndex];
	if (img) {
		openLightbox(img);
	}
}

document.addEventListener("keydown", (e) => {
	if (document.getElementById("lightbox").classList.contains("active")) {
		if (e.key === "Escape") closeLightbox();
		if (e.key === "ArrowLeft") navigateImage(-1);
		if (e.key === "ArrowRight") navigateImage(1);
	}
});

document.getElementById("lightbox").addEventListener("click", (e) => {
	if (e.target.id === "lightbox") closeLightbox();
});

// 兼容内联事件处理器（index.html 里的 onchange/onclick）
window.filterGallery = filterGallery;
window.closeLightbox = closeLightbox;
window.navigateImage = navigateImage;
window.toggleYear = toggleYear;

discoverImages();
