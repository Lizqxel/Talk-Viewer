/**
 * Talk Portal API (Google Apps Script)
 *
 * Required Script Properties:
 * - SPREADSHEET_ID
 * - ALLOWED_DOMAIN  (example: bb-connection.com)
 * - ALLOWED_EMAILS  (optional, comma-separated emails)
 * - TALKS_SHEET     (default: Talks)
 * - EDITORS_SHEET   (default: Editors)
 * - AUDIT_SHEET     (default: AuditLog)
 * - ALLOWED_RETURN_HOSTS (optional, comma-separated. ex: lizqxel.github.io,localhost:3000)
 */

function doGet(e) {
  const callback = getCallbackName_(e);

  if (isLegacyEchoRequest_(e)) {
    return sendResponse_(
      {
        ok: false,
        error: {
          code: "INVALID_ENDPOINT",
          message: "このURLでは利用できません。Webアプリの /exec URL を利用してください。",
        },
      },
      400,
      callback,
    );
  }

  try {
    const userEmail = getUserEmail_();

    if (!isDomainAllowed_(userEmail)) {
      return sendResponse_(
        {
          ok: false,
          error: {
            code: "FORBIDDEN_DOMAIN",
            message: "許可されたアカウントのみアクセス可能です",
          },
        },
        403,
        callback,
      );
    }

    const action = (e && e.parameter && e.parameter.action) || "";

    if (action === "authorize") {
      const returnTo = getReturnTo_(e);

      if (!callback && returnTo) {
        return htmlRedirectResponse_(returnTo);
      }

      return sendResponse_(
        {
          ok: true,
          message: "認証を確認しました。元のサイトに戻って再読み込みしてください。",
          user: {
            email: userEmail,
            canEdit: isEditor_(userEmail),
          },
        },
        200,
        callback,
      );
    }

    if (action !== "bootstrap") {
      return sendResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_ACTION",
            message: "指定された action はサポートされていません（bootstrap / authorize）",
          },
        },
        400,
        callback,
      );
    }

    const payload = buildBootstrapPayload_(userEmail);

    return sendResponse_(
      {
        ok: true,
        user: {
          email: userEmail,
          canEdit: isEditor_(userEmail),
        },
        data: payload,
      },
      200,
      callback,
    );
  } catch (err) {
    return sendResponse_(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: String(err),
        },
      },
      500,
      callback,
    );
  }
}

function doPost(e) {
  try {
    const userEmail = getUserEmail_();

    if (!isDomainAllowed_(userEmail)) {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "FORBIDDEN_DOMAIN",
            message: "許可されたアカウントのみアクセス可能です",
          },
        },
        403,
      );
    }

    if (!isEditor_(userEmail)) {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "FORBIDDEN_EDITOR",
            message: "編集権限がありません",
          },
        },
        403,
      );
    }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_BODY",
            message: "POSTボディが空です",
          },
        },
        400,
      );
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action || "";

    if (action !== "updateTalk") {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_ACTION",
            message: "updateTalk のみサポートしています",
          },
        },
        400,
      );
    }

    const talk = body.talk;
    if (!talk || !talk.id) {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_TALK",
            message: "talk.id が必要です",
          },
        },
        400,
      );
    }

    const result = upsertTalk_(talk, userEmail);

    appendAudit_("updateTalk", talk.id, userEmail, "ok", "revision=" + result.revision);

    return jsonResponse_({
      ok: true,
      user: {
        email: userEmail,
        canEdit: true,
      },
      data: {
        talkId: talk.id,
        revision: result.revision,
      },
    });
  } catch (err) {
    const email = safeEmail_();
    appendAudit_("updateTalk", "", email, "error", String(err));

    return jsonResponse_(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: String(err),
        },
      },
      500,
    );
  }
}

function buildBootstrapPayload_(userEmail) {
  const talks = listTalks_();

  const fallbackProductLabels = {
    hikari: "光回線",
    denki: "電気",
    wifi: "WiFi",
    oa: "OA機器",
  };

  const fallbackSceneLabels = {
    kojin: "個人宅向け",
    hojin: "法人向け",
    objection: "断り切り返し",
    remind: "リマインド",
    reception: "受付突破",
    negotiation: "商談",
  };

  return {
    announcements: [],
    dailyHighlights: [],
    quickLinks: [],
    featuredItems: talks.slice(0, 3).map(function (talk, index) {
      return {
        id: "featured-" + (index + 1),
        talkId: talk.id,
        reason: "最新運用データ",
        rank: index + 1,
      };
    }),
    recentUpdates: talks.slice(0, 5).map(function (talk, index) {
      return {
        id: "recent-" + (index + 1),
        talkId: talk.id,
        title: talk.title,
        detail: "スプレッドシート経由で更新",
        date: talk.updatedAt || "",
        type: "talk",
      };
    }),
    talkCategories: buildCategories_(talks),
    talkTags: collectTags_(talks),
    productLabels: fallbackProductLabels,
    sceneLabels: fallbackSceneLabels,
    talks: talks,
    user: {
      email: userEmail,
      canEdit: isEditor_(userEmail),
    },
  };
}

function listTalks_() {
  const sheet = getSheet_(prop_("TALKS_SHEET", "Talks"));
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return [];
  }

  const header = values[0];
  const rows = values.slice(1);

  const idx = indexMap_(header);
  const talks = [];

  rows.forEach(function (row) {
    const isActive = String(row[idx.is_active] || "TRUE").toUpperCase() === "TRUE";
    if (!isActive) {
      return;
    }

    const jsonText = row[idx.payload_json];
    if (!jsonText) {
      return;
    }

    const talk = JSON.parse(String(jsonText));
    talk.updatedAt = row[idx.updated_at] || talk.updatedAt || "";
    talks.push(talk);
  });

  talks.sort(function (a, b) {
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });

  return talks;
}

function upsertTalk_(talk, userEmail) {
  const sheet = getSheet_(prop_("TALKS_SHEET", "Talks"));
  const values = sheet.getDataRange().getValues();

  const header = values[0];
  const idx = indexMap_(header);
  const now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");

  let rowIndex = -1;
  let currentRevision = 0;

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][idx.talk_id]) === String(talk.id)) {
      rowIndex = i + 1;
      currentRevision = Number(values[i][idx.revision] || 0);
      break;
    }
  }

  const nextRevision = currentRevision + 1;
  const rowValues = [
    talk.id,
    talk.title || "",
    now,
    userEmail,
    nextRevision,
    true,
    JSON.stringify(talk),
  ];

  if (rowIndex === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  }

  return { revision: nextRevision };
}

function buildCategories_(talks) {
  var seen = {};
  var result = [];

  talks.forEach(function (talk) {
    var id = talk.categoryId || "uncategorized";
    if (seen[id]) {
      return;
    }
    seen[id] = true;

    result.push({
      id: id,
      name: talk.categoryName || id,
      description: "",
      product: talk.product || "hikari",
      scene: talk.scene || "kojin",
    });
  });

  return result;
}

function collectTags_(talks) {
  var map = {};

  talks.forEach(function (talk) {
    (talk.tags || []).forEach(function (tag) {
      map[tag] = true;
    });
  });

  return Object.keys(map);
}

function isEditor_(email) {
  const sheet = getSheet_(prop_("EDITORS_SHEET", "Editors"));
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return false;
  }

  const header = values[0];
  const idx = indexMap_(header);

  for (var i = 1; i < values.length; i += 1) {
    const rowEmail = String(values[i][idx.email] || "")
      .toLowerCase()
      .trim();
    const canEdit = String(values[i][idx.can_edit] || "").toUpperCase() === "TRUE";
    const isActive = String(values[i][idx.is_active] || "").toUpperCase() === "TRUE";

    if (rowEmail === String(email).toLowerCase().trim() && canEdit && isActive) {
      return true;
    }
  }

  return false;
}

function appendAudit_(action, talkId, actorEmail, result, detail) {
  const sheet = getSheet_(prop_("AUDIT_SHEET", "AuditLog"));
  const now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([now, action, talkId, actorEmail, result, detail]);
}

function isDomainAllowed_(email) {
  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();
  if (!normalizedEmail) {
    return false;
  }

  const allowedEmailsText = prop_("ALLOWED_EMAILS", "");
  const allowedEmails = allowedEmailsText
    .split(",")
    .map(function (item) {
      return String(item || "")
        .toLowerCase()
        .trim();
    })
    .filter(function (item) {
      return item !== "";
    });

  if (allowedEmails.indexOf(normalizedEmail) !== -1) {
    return true;
  }

  const domain = prop_("ALLOWED_DOMAIN", "").toLowerCase().trim();
  if (!domain) {
    return false;
  }

  const match = normalizedEmail.match(/@(.+)$/);
  if (!match) {
    return false;
  }

  return match[1] === domain;
}

function getUserEmail_() {
  const email = safeEmail_();
  if (!email) {
    throw new Error("ユーザーのメールアドレスを取得できませんでした");
  }
  return email;
}

function safeEmail_() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (err) {
    return "";
  }
}

function prop_(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value !== null && value !== "" ? value : fallback;
}

function getSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(prop_("SPREADSHEET_ID", ""));
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("シートが見つかりません: " + sheetName);
  }
  return sheet;
}

function indexMap_(header) {
  var map = {};

  for (var i = 0; i < header.length; i += 1) {
    var key = String(header[i] || "").trim();
    if (!key) {
      continue;
    }
    map[key] = i;
  }

  return map;
}

function jsonResponse_(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function sendResponse_(obj, statusCode, callbackName) {
  if (callbackName) {
    return jsonpResponse_(callbackName, obj);
  }

  return jsonResponse_(obj, statusCode);
}

function jsonpResponse_(callbackName, obj) {
  const output = ContentService.createTextOutput(callbackName + "(" + JSON.stringify(obj) + ");");
  output.setMimeType(ContentService.MimeType.JAVASCRIPT);
  return output;
}

function getCallbackName_(e) {
  const raw = e && e.parameter && e.parameter.callback ? String(e.parameter.callback).trim() : "";

  if (!raw) {
    return "";
  }

  const isValid = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(raw);
  return isValid ? raw : "";
}

function isLegacyEchoRequest_(e) {
  if (!e || !e.parameter) {
    return false;
  }

  const hasUserContentKey = Boolean(e.parameter.user_content_key);
  const hasLibraryKey = Boolean(e.parameter.lib);
  return hasUserContentKey || hasLibraryKey;
}

function getReturnTo_(e) {
  if (!e || !e.parameter || !e.parameter.return_to) {
    return "";
  }

  const raw = String(e.parameter.return_to || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    const protocol = String(url.protocol || "").toLowerCase();
    if (protocol !== "https:" && protocol !== "http:") {
      return "";
    }

    const allowedHosts = prop_("ALLOWED_RETURN_HOSTS", "lizqxel.github.io,localhost:3000")
      .split(",")
      .map(function (value) {
        return String(value || "")
          .toLowerCase()
          .trim();
      })
      .filter(function (value) {
        return value !== "";
      });

    const host = String(url.host || "")
      .toLowerCase()
      .trim();
    if (allowedHosts.indexOf(host) === -1) {
      return "";
    }

    return url.toString();
  } catch (err) {
    return "";
  }
}

function htmlRedirectResponse_(url) {
  const escapedUrl = JSON.stringify(String(url || ""));
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>認証完了</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;">' +
    '<p style="margin:0 0 12px;">認証を確認しました。元の画面に戻ります...</p>' +
    "<script>window.location.replace(" +
    escapedUrl +
    ");</script>" +
    '<p style="margin:0;">自動で戻らない場合は <a id="return-link" href="#">こちら</a> をクリックしてください。</p>' +
    "<script>document.getElementById('return-link').setAttribute('href', " +
    escapedUrl +
    ");</script>" +
    "</body></html>";

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
}
