const couple = "{{groom_name}} và {{bride_name}}";
const mapSearch = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
const mapUrls = {
  "bride-reception": mapSearch("{{bride_address}}"),
  "bride-ceremony": mapSearch("{{church_address}}"),
  "groom-home": mapSearch("{{groom_address}}"),
  "pickup-pham-ngoc-thach": mapSearch("{{pickup_one}}"),
  "pickup-nguyen-dinh-chieu": mapSearch("{{pickup_two}}"),
  "can-tho-attraction": mapSearch("Chợ nổi Cái Răng, Cần Thơ"),
  "dong-nai-attraction": mapSearch("Thác Giang Điền, Trảng Bom, Đồng Nai"),
};
const invitationData = {
  bride: {
    countdownDate: "{{bride_date}}T{{bride_start}}:00+07:00",
    calendarEvents: [
      {
        start: "{{bride_date}}T{{bride_start}}:00+07:00",
        end: "{{bride_date}}T{{bride_end}}:00+07:00",
        summary: "Tiệc nhà gái - {{groom_name}} và {{bride_name}}",
        location: "{{bride_address}}",
      },
    ],
  },
  groom: {
    countdownDate: "{{groom_date}}T{{groom_start}}:00+07:00",
    calendarEvents: [
      {
        start: "{{groom_date}}T{{groom_start}}:00+07:00",
        end: "{{groom_date}}T{{groom_reception}}:00+07:00",
        summary: "Lễ thành hôn - {{groom_name}} và {{bride_name}}",
        location: "{{groom_address}}",
      },
      {
        start: "{{groom_date}}T{{groom_reception}}:00+07:00",
        end: "{{groom_date}}T{{groom_end}}:00+07:00",
        summary: "Tiệc nhà trai - {{groom_name}} và {{bride_name}}",
        location: "{{groom_address}}",
      },
    ],
  },
};
const wedding = invitationData[document.body.dataset.invitation];
const rsvpEmail = "{{rsvp_email}}";

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Mở menu" : "Đóng menu");
  siteNav.classList.toggle("is-open", !isOpen);
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Mở menu");
    siteNav.classList.remove("is-open");
  }
});

document.querySelectorAll("[data-map-link]").forEach((link) => {
  link.href = mapUrls[link.dataset.mapLink];
});

const countdownTarget = new Date(wedding.countdownDate).getTime();
const countdownUnits = {
  days: 24 * 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  minutes: 60 * 1000,
  seconds: 1000,
};

function updateCountdown() {
  let remaining = Math.max(0, countdownTarget - Date.now());
  for (const [unit, milliseconds] of Object.entries(countdownUnits)) {
    const value = Math.floor(remaining / milliseconds);
    document.getElementById(unit).textContent = String(value).padStart(2, "0");
    remaining %= milliseconds;
  }
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

let heartCount = 0;
const heartButton = document.getElementById("heart-button");

heartButton.addEventListener("click", () => {
  heartCount += 1;
  document.getElementById("heart-count").textContent = String(heartCount);
  document.getElementById("heart-label").textContent = "Cảm ơn bạn đã gửi yêu thương!";
  heartButton.setAttribute("aria-pressed", "true");

  const particle = document.createElement("span");
  particle.className = "heart-particle";
  particle.setAttribute("aria-hidden", "true");
  particle.textContent = "♥";
  heartButton.append(particle);
  window.setTimeout(() => particle.remove(), 1100);
});

const guestMessageForm = document.getElementById("guest-message-form");
const sharePreview = document.getElementById("share-preview");
const sharePreviewLabel = document.querySelector(".share-preview-label");
const guestMessageNote = document.getElementById("guest-message-note");

guestMessageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(guestMessageForm);
  const name = String(formData.get("guestName")).trim();
  const wish = String(formData.get("wish")).trim();
  const song = String(formData.get("song")).trim();
  const songLine = song ? `\nBài hát gợi ý: ${song}` : "";
  const message = [
    `Lời chúc từ ${name} gửi đến ${couple}:`,
    wish,
    songLine,
  ].filter(Boolean).join("\n");

  sharePreview.value = message;
  sharePreview.hidden = false;
  sharePreviewLabel.hidden = false;
  guestMessageNote.textContent = "";

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: `Lời chúc gửi đến ${couple}`,
        text: message,
      });
      guestMessageNote.textContent = "Bảng chia sẻ đã đóng. Cảm ơn bạn đã gửi lời chúc.";
    } catch (error) {
      if (error.name === "AbortError") {
        guestMessageNote.textContent = "Bạn đã đóng bảng chia sẻ. Nội dung vẫn ở đây để chia sẻ sau.";
      } else {
        guestMessageNote.textContent = `Không mở được bảng chia sẻ: ${error.message}. Bạn có thể sao chép nội dung bên dưới.`;
        sharePreview.focus();
        sharePreview.select();
      }
    }
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(message);
      guestMessageNote.textContent = "Đã sao chép lời chúc. Hãy dán vào Zalo, Messenger hoặc ứng dụng nhắn tin để gửi cho gia đình.";
    } catch (error) {
      guestMessageNote.textContent = "Trình duyệt chưa cho phép tự sao chép. Hãy chọn nội dung bên dưới rồi sao chép thủ công.";
      sharePreview.focus();
      sharePreview.select();
    }
    return;
  }

  guestMessageNote.textContent = "Hãy chọn và sao chép nội dung bên dưới rồi gửi cho gia đình qua ứng dụng nhắn tin.";
  sharePreview.focus();
  sharePreview.select();
});

const photoUpload = document.getElementById("photo-upload");
const galleryGrid = document.getElementById("gallery-grid");

photoUpload.addEventListener("change", (event) => {
  const files = Array.from(event.target.files || []);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  const uploadNote = document.getElementById("upload-note");
  if (imageFiles.length === 0) {
    uploadNote.textContent = "Hãy chọn ít nhất một tệp ảnh để thêm vào album xem trước.";
    photoUpload.value = "";
    return;
  }

  uploadNote.textContent = `${imageFiles.length} ảnh đã được thêm vào album xem trước trên thiết bị này.`;
  for (const file of imageFiles) {
    const imageUrl = URL.createObjectURL(file);
    const figure = document.createElement("figure");
    figure.className = "gallery-item is-uploaded";
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = `Ảnh được thêm: ${file.name}`;
    image.addEventListener("load", () => URL.revokeObjectURL(imageUrl), { once: true });
    image.addEventListener("error", () => URL.revokeObjectURL(imageUrl), { once: true });
    const removeButton = document.createElement("button");
    removeButton.className = "remove-photo";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Xóa ảnh ${file.name}`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      figure.remove();
    });
    figure.append(image, removeButton);
    galleryGrid.prepend(figure);
  }
  photoUpload.value = "";
});

document.getElementById("calendar-button").addEventListener("click", () => {
  const calendarText = (value) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const toCalendarDate = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const timestamp = toCalendarDate(new Date());
  const event = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Invitation//VI",
    ...wedding.calendarEvents.flatMap((item, index) => [
      "BEGIN:VEVENT",
      `UID:${document.body.dataset.invitation}-${index + 1}@thiepcuoionline`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${toCalendarDate(new Date(item.start))}`,
      `DTEND:${toCalendarDate(new Date(item.end))}`,
      `SUMMARY:${calendarText(item.summary)}`,
      `DESCRIPTION:${calendarText(`Trân trọng kính mời bạn đến chung vui cùng ${couple}.`)}`,
      `LOCATION:${calendarText(item.location)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
  const file = new Blob([event], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "thiep-cuoi.ics";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

document.getElementById("rsvp-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const note = document.getElementById("form-note");
  const name = String(formData.get("name")).trim();
  const attendance = String(formData.get("attendance"));
  const shuttle = formData.get("shuttle");
  const message = String(formData.get("message")).trim() || "(Không có lời nhắn)";
  const subject = encodeURIComponent(`Xác nhận tham dự đám cưới của ${couple} - ${name}`);
  const shuttleLine = shuttle ? `\nXe đưa đón: ${shuttle}` : "";
  const body = encodeURIComponent(
    `Tên: ${name}\nTham dự: ${attendance}${shuttleLine}\nLời nhắn: ${message}`,
  );

  if (!rsvpEmail) {
    note.textContent = "Chức năng RSVP chưa có email nhận. Vui lòng liên hệ gia đình để xác nhận tham dự và đặt chỗ xe.";
    return;
  }

  note.textContent = "Đang mở ứng dụng email để gửi xác nhận...";
  window.location.href = `mailto:${rsvpEmail}?subject=${subject}&body=${body}`;
});
