/* CS409 MP1 - Sumireji's Songlist */

/* Update this timestamp after each live stream ends (UTC+8). */
const LAST_LIVE_END = "2026-08-31T13:17:14+08:00";

/* ---------- navbar: shrink, active link, smooth scroll ---------- */
const navbar = document.getElementById("navbar");
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section[id], footer[id]");

function updateNavbar() {
    if (window.scrollY > 60) {
        navbar.classList.add("shrunk");
    } else {
        navbar.classList.remove("shrunk");
    }
}

function updateActiveLink() {
    // the position of every section is recalculated on each scroll
    let current = sections[0].id;
    const offset = window.scrollY + navbar.offsetHeight + 20;

    for (let i = 0; i < sections.length; i++) {
        const top = sections[i].getBoundingClientRect().top + window.scrollY;
        if (top <= offset) {
            current = sections[i].id;
        }
    }

    // at the bottom of the page the last link (Contact) stays highlighted
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = sections[sections.length - 1].id;
    }

    navLinks.forEach(function (link) {
        link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });
}

// smooth scrolling that leaves room for the sticky navbar
document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) {
            return;
        }
        event.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight - 8;
        window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    });
});

window.addEventListener("scroll", function () {
    updateNavbar();
    updateActiveLink();
});

window.addEventListener("resize", updateActiveLink);

/* ---------- hero video ---------- */
// mp4 files are not bundled by webpack, so the source is set here
const heroVideo = document.getElementById("hero-video");
heroVideo.src = "assets/header.mp4";
heroVideo.play().catch(function () {
    // if autoplay is blocked the poster picture stays visible
});

/* ---------- gallery carousel ---------- */
const track = document.getElementById("carousel-track");
const counter = document.getElementById("carousel-counter");
const slideCount = track.children.length;
let slideIndex = 0;

function showSlide(index) {
    if (index < 0) {
        slideIndex = slideCount - 1;
    } else if (index >= slideCount) {
        slideIndex = 0;
    } else {
        slideIndex = index;
    }

    track.style.transform = "translateX(-" + slideIndex * 100 + "%)";
    counter.textContent = (slideIndex + 1) + " / " + slideCount;
}

document.getElementById("carousel-prev").addEventListener("click", function () {
    showSlide(slideIndex - 1);
});

document.getElementById("carousel-next").addEventListener("click", function () {
    showSlide(slideIndex + 1);
});

/* ---------- time since the last stream ---------- */
const countdownDays = document.getElementById("timer-days");
const countdownDaysUnit = document.getElementById("timer-days-unit");
const countdownHms = document.getElementById("timer-hms");
const lastLiveText = document.getElementById("last-live-text");

function pad2(number) {
    return number < 10 ? "0" + number : "" + number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateTime(epoch) {
    // shown in UTC+8, the time zone of the streamer
    const date = new Date(epoch);
    const beijing = new Date(date.getTime() + (date.getTimezoneOffset() + 480) * 60000);
    const hour24 = beijing.getHours();
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

    return MONTHS[beijing.getMonth()] + " " + beijing.getDate() + ", " + beijing.getFullYear() +
        ", " + hour12 + ":" + pad2(beijing.getMinutes()) + " " + (hour24 < 12 ? "AM" : "PM");
}

function updateCountdown() {
    const lastEnd = new Date(LAST_LIVE_END).getTime();
    const total = Math.floor((Date.now() - lastEnd) / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    countdownDays.textContent = days;
    countdownDays.hidden = days === 0;
    countdownDaysUnit.hidden = days === 0;
    countdownDaysUnit.textContent = days === 1 ? "day" : "days";
    countdownHms.textContent = pad2(hours) + ":" + pad2(minutes) + ":" + pad2(seconds);

    lastLiveText.textContent = "Last stream ended: " + formatDateTime(lastEnd) + " (UTC+8)";
}

setInterval(updateCountdown, 1000);

/* ---------- request modal ---------- */
const modal = document.getElementById("request-modal");

function openModal() {
    modal.hidden = false;
}

function closeModal() {
    modal.hidden = true;
}

document.getElementById("hero-request-btn").addEventListener("click", openModal);
document.getElementById("about-request-btn").addEventListener("click", openModal);
document.getElementById("modal-close").addEventListener("click", closeModal);

modal.addEventListener("click", function (event) {
    if (event.target === modal) {
        closeModal(); // click on the dark overlay
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) {
        closeModal();
    }
});

/* ---------- toast + clipboard ---------- */
const toast = document.getElementById("toast");
let toastTimer = null;

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        toast.classList.remove("visible");
    }, 2200);
}

function fallbackCopy(text) {
    const helper = document.createElement("textarea");
    helper.className = "copy-helper";
    helper.value = text;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
}

function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(showCopied, function () {
            fallbackCopy(text);
            showCopied();
        });
    } else {
        fallbackCopy(text);
        showCopied();
    }
}

function showCopied() {
    showToast("Copied! Paste it in the live chat");
}

function requestSong(song) {
    // the live chat command is always in Chinese
    copyText("点歌 " + song.song_name);
}

/* ---------- song list ---------- */
const state = { songs: [], visible: [], randomSong: null };

const searchInput = document.getElementById("search-input");
const languageSelect = document.getElementById("language-select");
const artistSelect = document.getElementById("artist-select");
const tableBody = document.getElementById("song-rows");
const countLabel = document.getElementById("result-count");
const emptyState = document.getElementById("empty-state");
const errorState = document.getElementById("error-state");
const randomBox = document.getElementById("random-result");
const randomName = document.getElementById("random-name");
const randomArtist = document.getElementById("random-artist");

function makeTag(label, extraClass) {
    const tag = document.createElement("span");
    tag.className = extraClass ? "tag " + extraClass : "tag";
    tag.textContent = label;
    return tag;
}

function makeTextCell(label, className, value) {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    if (className) {
        cell.className = className;
    }
    cell.textContent = value && String(value).trim() ? value : "—";
    return cell;
}

function buildRow(song) {
    const row = document.createElement("tr");
    if (song.paid) {
        row.classList.add("is-specialty");
    }

    // song name (a link when a bilibili video exists)
    const nameCell = document.createElement("td");
    nameCell.dataset.label = "Song";
    const name = document.createElement(song.link ? "a" : "span");
    name.className = "song-name";
    name.textContent = song.song_name;
    if (song.link) {
        name.href = song.link;
        name.target = "_blank";
        name.rel = "noopener noreferrer";
        name.title = "Watch " + song.song_name + " on bilibili";
    }
    nameCell.appendChild(name);

    const tags = document.createElement("span");
    tags.className = "tag-list";
    if (song.paid) {
        tags.appendChild(makeTag("Specialty", "tag-specialty"));
    }
    if (song.play) {
        tags.appendChild(makeTag("Paid", "tag-paid"));
    }
    if (tags.children.length > 0) {
        nameCell.appendChild(tags);
    }
    row.appendChild(nameCell);

    row.appendChild(makeTextCell("Artist", "artist", song.artist));
    row.appendChild(makeTextCell("Language", "", song.language));
    row.appendChild(makeTextCell("Notes", "notes", song.remarks));

    const actionCell = document.createElement("td");
    actionCell.dataset.label = "Copy";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "copy-btn";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", function (event) {
        event.stopPropagation();
        requestSong(song);
    });
    actionCell.appendChild(copyButton);
    row.appendChild(actionCell);

    row.addEventListener("click", function (event) {
        const tagName = event.target.tagName;
        if (tagName === "A" || tagName === "BUTTON") {
            return;
        }
        requestSong(song);
    });

    return row;
}

function renderSongs() {
    const fragment = document.createDocumentFragment();
    state.visible.forEach(function (song) {
        fragment.appendChild(buildRow(song));
    });
    tableBody.textContent = "";
    tableBody.appendChild(fragment);

    emptyState.hidden = state.visible.length > 0;
    countLabel.textContent = "Showing " + state.visible.length + " / " + state.songs.length + " songs";
}

function applyFilters() {
    const keyword = searchInput.value.trim().toLowerCase();
    const language = languageSelect.value;
    const artist = artistSelect.value;

    state.visible = state.songs.filter(function (song) {
        if (language && song.language !== language) {
            return false;
        }
        if (artist && song.artist !== artist) {
            return false;
        }
        if (!keyword) {
            return true;
        }
        return [song.song_name, song.artist, song.language, song.remarks].some(function (field) {
            return field && String(field).toLowerCase().indexOf(keyword) !== -1;
        });
    });

    renderSongs();
}

function pickRandomSong() {
    if (state.visible.length === 0) {
        showToast("No songs match the current filters");
        return;
    }

    const song = state.visible[Math.floor(Math.random() * state.visible.length)];
    state.randomSong = song;
    randomName.textContent = song.song_name;
    randomArtist.textContent = song.artist ? song.artist : "—";
    randomBox.hidden = false;
    randomBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fillSelect(select, values) {
    values.forEach(function (value) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function loadSongs() {
    fetch("assets/songlist.json")
        .then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        })
        .then(function (songs) {
            state.songs = songs;
            state.visible = songs.slice();

            const languages = [];
            const artists = [];
            songs.forEach(function (song) {
                if (languages.indexOf(song.language) === -1) {
                    languages.push(song.language);
                }
                if (artists.indexOf(song.artist) === -1) {
                    artists.push(song.artist);
                }
            });

            fillSelect(languageSelect, languages.sort());
            fillSelect(artistSelect, artists.sort());
            renderSongs();
        })
        .catch(function () {
            countLabel.textContent = "Song list unavailable";
            errorState.hidden = false;
        });
}

searchInput.addEventListener("input", applyFilters);
languageSelect.addEventListener("change", applyFilters);
artistSelect.addEventListener("change", applyFilters);

document.getElementById("clear-btn").addEventListener("click", function () {
    searchInput.value = "";
    languageSelect.value = "";
    artistSelect.value = "";
    applyFilters();
});

document.getElementById("random-btn").addEventListener("click", pickRandomSong);

document.getElementById("random-copy").addEventListener("click", function () {
    if (state.randomSong) {
        requestSong(state.randomSong);
    }
});

/* ---------- fade in when a section is scrolled into view ---------- */
const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    revealItems.forEach(function (item) {
        observer.observe(item);
    });
} else {
    revealItems.forEach(function (item) {
        item.classList.add("visible");
    });
}

/* ---------- start ---------- */
updateNavbar();
updateActiveLink();
updateCountdown();
showSlide(0);
loadSongs();
