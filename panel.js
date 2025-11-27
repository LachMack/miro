console.log("[Find & Replace] panel loaded");

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

async function getItems(scope) {
  if (scope === 'selection') {
    return await miro.board.getSelection();
  } else {
    return await miro.board.get();
  }
}

function matchesType(item, typeFilter) {
  if (!typeFilter) return true;
  return item.type === typeFilter;
}

function supported(item) {
  return ["text","sticky_note","shape","card"].includes(item.type);
}

function getMatchInfo(item, re, preserveHtml) {
  let hay = "";
  if (["text","sticky_note","shape"].includes(item.type)) {
    hay = preserveHtml ? item.content : stripHtml(item.content || "");
  } else if (item.type === "card") {
    hay = `${item.title || ""}\n${item.description || ""}`;
  } else {
    return { count:0, sample:"" };
  }
  const matches = hay.match(re);
  return { count: matches ? matches.length : 0, sample: hay.slice(0, 200) };
}

async function doReplace(items, re, replacement, preserveHtml) {
  let total = 0, touched = 0;
  for (const item of items) {
    if (!supported(item)) continue;
    let changed = false;
    if (["text","sticky_note","shape"].includes(item.type)) {
      const before = item.content || "";
      const after = insertAsHtml(before, re, replacement, preserveHtml);
      if (after !== before) {
        item.content = after;
        changed = true;
        total += (before.match(re) || []).length;
      }
    } else if (item.type === "card") {
      let count = 0;
      if (typeof item.title === "string") {
        const newTitle = item.title.replace(re, () => { count++; return replacement; });
        if (newTitle !== item.title) {
          item.title = newTitle;
          changed = true;
        }
      }
      if (typeof item.description === "string") {
        const newDesc = item.description.replace(re, () => { count++; return replacement; });
        if (newDesc !== item.description) {
          item.description = newDesc;
          changed = true;
        }
      }
      if (changed) total += count;
    }
    if (changed) {
      await item.sync();
      touched++;
    }
  }
  return { total, touched };
}

function renderResults(list, totalMatches, totalItems) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = "<div class='small'>No matches found.</div>";
    return;
  }
  list.forEach(r => {
    const d = document.createElement("div");
    d.className = "item";
    d.innerHTML = `<div><strong>${r.type}</strong> — ${r.count} match(es)</div>
                   <div class='small'>… ${r.sample} …</div>`;
    container.appendChild(d);
  });
  const footer = document.createElement("div");
  footer.className = "small";
  footer.style.marginTop = "8px";
  footer.innerHTML = `<strong>Total matches:</strong> ${totalMatches} — in <strong>${totalItems}</strong> item(s).`;
  container.appendChild(footer);
}

document.getElementById("search").addEventListener("click", async () => {
  console.log("[Find & Replace] Search clicked");
  const find = document.getElementById("find").value;
  const scope = document.getElementById("scope").value;
  const typeFilter = document.getElementById("filter-type").value;
  const caseSensitive = document.getElementById("opt-case").checked;
  const wholeWord = document.getElementById("opt-whole").checked;
  const regex = document.getElementById("opt-regex").checked;
  const preserveHtml = document.getElementById("opt-html").checked;

  if (!find) {
    alert("Please enter text to find.");
    return;
  }

  const re = asRegex(find, { caseSensitive, wholeWord, regex });
  const items = (await getItems(scope)).filter(item => supported(item) && matchesType(item, typeFilter));
  const resultList = [];
  let totalMatches = 0;

  for (const it of items) {
    const { count, sample } = getMatchInfo(it, re, preserveHtml);
    if (count > 0) {
      resultList.push({ id: it.id, type: it.type, count, sample });
      totalMatches += count;
    }
  }
  renderResults(resultList, totalMatches, resultList.length);
});

document.getElementById("replace-all").addEventListener("click", async () => {
  console.log("[Find & Replace] Replace All clicked");
  const find = document.getElementById("find").value;
  const replacement = document.getElementById("replace").value || "";
  const scope = document.getElementById("scope").value;
  const typeFilter = document.getElementById("filter-type").value;
  const caseSensitive = document.getElementById("opt-case").checked;
  const wholeWord = document.getElementById("opt-whole").checked;
  const regex = document.getElementById("opt-regex").checked;
  const preserveHtml = document.getElementById("opt-html").checked;

  if (!find) {
    alert("Please enter text to find.");
    return;
  }

  const re = asRegex(find, { caseSensitive, wholeWord, regex });
  const items = (await getItems(scope)).filter(item => supported(item) && matchesType(item, typeFilter));

  const { total, touched } = await doReplace(items, re, replacement, preserveHtml);
  console.log(`[Find & Replace] Replaced ${total} occurrences in ${touched} items`);
  document.getElementById("results").innerHTML = `<div class="small">Replaced ${total} occurrence(s) in ${touched} item(s).</div>`;
});
