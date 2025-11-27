// panel.js — updated Find & Replace logic
console.log("[Find & Replace Panel] loaded");

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
}

function asRegex(find, { caseSensitive, wholeWord, regex }) {
  const flags = caseSensitive ? "g" : "gi";
  let pattern = regex ? find : escapeRegExp(find);
  if (wholeWord) pattern = `\\b${pattern}\\b`;
  return new RegExp(pattern, flags);
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function insertAsHtml(originalHtml, re, replacement, preserveHtml) {
  if (preserveHtml) {
    return originalHtml.replace(re, replacement);
  } else {
    const text = stripHtml(originalHtml);
    const replaced = text.replace(re, replacement);
    return `<p>${replaced.replace(/\\n/g, "<br>")}</p>`;
  }
}

// Get items (all or selection)
async function getTargetItems(selectionOnly) {
  if (selectionOnly) {
    return (await miro.board.getSelection());
  } else {
    return (await miro.board.get());
  }
}

// Check if item matches the selected object type filter
function matchesTypeFilter(item, typeFilter) {
  if (!typeFilter) return true;
  return item.type === typeFilter;
}

// Determine if item is supported by type
function isSupported(item) {
  return ["text", "sticky_note", "shape", "card"].includes(item.type);
}

function getMatchesPreview(item, re, { preserveHtml }) {
  let count = 0, sample = "";
  let hay = "";
  if (["text","sticky_note","shape"].includes(item.type)) {
    hay = preserveHtml ? item.content : stripHtml(item.content || "");
    const matches = hay.match(re);
    count = matches ? matches.length : 0;
    sample = hay.slice(0, 140);
  } else if (item.type === "card") {
    hay = `${item.title || ""}\n${item.description || ""}`;
    const matches = hay.match(re);
    count = matches ? matches.length : 0;
    sample = hay.slice(0, 140);
  }
  return { count, sample };
}

async function doReplace(items, re, replacement, { preserveHtml }) {
  let totalReplacements = 0;
  let touched = 0;
  for (const item of items) {
    if (!isSupported(item)) continue;
    let changed = false;
    if (["text","sticky_note","shape"].includes(item.type)) {
      const before = item.content || "";
      const after = insertAsHtml(before, re, replacement, preserveHtml);
      if (after !== before) {
        item.content = after;
        changed = true;
        const matches = before.match(re);
        totalReplacements += matches ? matches.length : 0;
      }
    } else if (item.type === "card") {
      let count = 0;
      if (typeof item.title === "string") {
        const before = item.title;
        const after = before.replace(re, () => { count++; return replacement; });
        if (after !== before) {
          item.title = after;
          changed = true;
        }
      }
      if (typeof item.description === "string") {
        const before = item.description;
        const after = before.replace(re, () => { count++; return replacement; });
        if (after !== before) {
          item.description = after;
          changed = true;
        }
      }
      if (changed) {
        totalReplacements += count;
      }
    }
    if (changed) {
      await item.sync();
      touched++;
    }
  }
  return { totalReplacements, touched };
}

function renderResults(list, totals) {
  const el = document.getElementById("results");
  el.innerHTML = "";
  if (list.length === 0) {
    el.innerHTML = `<div class="small">No matches.</div>`;
    return;
  }
  list.forEach(r => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div><strong>${r.type}</strong> <span class="badge">matches: <span class="counter">${r.count}</span></span></div>
      <div class="small">${r.sample.replace(/[<>&]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}...</div>`;
    el.appendChild(div);
  });
  const footer = document.createElement("div");
  footer.className = "small";
  footer.style.marginTop = "8px";
  footer.innerHTML = `<strong>Total matches:</strong> <span class="counter">${totals.matches}</span> across <span class="counter">${totals.items}</span> items.`;
  el.appendChild(footer);
}

document.getElementById("search").addEventListener("click", async () => {
  console.log("[Find & Replace] Search clicked");
  const find = document.getElementById("find").value;
  const selectionOnly = document.getElementById("opt-selection").checked;
  const caseSensitive = document.getElementById("opt-case").checked;
  const wholeWord = document.getElementById("opt-whole").checked;
  const regex = document.getElementById("opt-regex").checked;
  const preserveHtml = document.getElementById("opt-html").checked;
  const filterType = document.getElementById("filter-type").value;

  if (!find) {
    document.getElementById("results").innerHTML = '<div class="small">Enter something to find.</div>';
    return;
  }

  const re = asRegex(find, { caseSensitive, wholeWord, regex });
  const allItems = await getTargetItems(selectionOnly);
  const items = allItems.filter(item => isSupported(item) && matchesTypeFilter(item, filterType));

  const rows = [];
  let matches = 0;
  for (const it of items) {
    const { count, sample } = getMatchesPreview(it, re, { preserveHtml });
    if (count > 0) {
      rows.push({ id: it.id, type: it.type, count, sample });
      matches += count;
    }
  }
  renderResults(rows, { matches, items: rows.length });
});

document.getElementById("replace-all").addEventListener("click", async () => {
  console.log("[Find & Replace] Replace All clicked");
  const find = document.getElementById("find").value;
  const replacement = document.getElementById("replace").value || "";
  const selectionOnly = document.getElementById("opt-selection").checked;
  const caseSensitive = document.getElementById("opt-case").checked;
  const wholeWord = document.getElementById("opt-whole").checked;
  const regex = document.getElementById("opt-regex").checked;
  const preserveHtml = document.getElementById("opt-html").checked;
  const filterType = document.getElementById("filter-type").value;

  if (!find) {
    document.getElementById("results").innerHTML = '<div class="small">Enter something to find.</div>';
    return;
  }

  const re = asRegex(find, { caseSensitive, wholeWord, regex });
  const allItems = await getTargetItems(selectionOnly);
  const items = allItems.filter(item => isSupported(item) && matchesTypeFilter(item, filterType));

  const { totalReplacements, touched } = await doReplace(items, re, replacement, { preserveHtml });
  console.log(`[Find & Replace] replaced: ${totalReplacements} occurrences in ${touched} items`);
  document.getElementById("results").innerHTML = `<div class="small">Replaced <span class="counter">${totalReplacements}</span> occurrence(s) in <span class="counter">${touched}</span> item(s).</div>`;
});
