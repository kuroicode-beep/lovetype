(function () {
  var STORAGE_THEME_KEY = "theme_mode";
  var STORAGE_RESULT_PAYLOAD_KEY = "lovetype_result_payload";
  var STORAGE_COMPLETED_DATE_KEY = "completed_date";
  var STORAGE_RESULT_KEY = "mbti_result";
  var STORAGE_AXIS_KEY = "axis_scores";
  var STORAGE_AXIS_STRENGTH_KEY = "axis_strength";
  var STORAGE_GRAPH_KEY = "graph_values";
  var STORAGE_CACHE_KEY = "cache_key";
  var STORAGE_VERSION_KEY = "result_version";
  var STORAGE_SUMMARY_KEY = "result_summary";
  var STORAGE_DETAIL_KEY = "result_detail";
  var STORAGE_NEXT_AVAILABLE_KEY = "next_available_at";

  var HIGH_CONTRAST = "hc";
  var DEFAULT_THEME = "default";
  var API_ENDPOINT = "/api/mbti-test/result";
  var POSITIVE_VALUES = {
    strong_4_1: 70,
    strong_5_0: 100,
    weak: 35
  };
  var POSITIVE_LETTER_BY_AXIS = {
    EI: "E",
    SN: "S",
    TF: "T",
    JP: "J"
  };
  var AXIS_META = {
    EI: { letters: ["E", "I"], labels: { E: "외향", I: "내향" } },
    SN: { letters: ["S", "N"], labels: { S: "감각", N: "직관" } },
    TF: { letters: ["T", "F"], labels: { T: "사고", F: "감정" } },
    JP: { letters: ["J", "P"], labels: { J: "판단", P: "인식" } }
  };

  var state = {
    questionsData: null,
    baseResults: null,
    axisModifiers: null,
    shareCopy: null,
    currentQuestionIndex: 0,
    answers: [],
    apiMode: "uninitialized",
    resultPayload: null
  };

  var screens = {
    landing: document.getElementById("landing-screen"),
    question: document.getElementById("question-screen"),
    result: document.getElementById("result-screen")
  };

  var elements = {
    themeToggle: document.getElementById("theme-toggle"),
    startButton: document.getElementById("start-test-button"),
    loadStatus: document.getElementById("load-status"),
    metaQuestionCount: document.getElementById("meta-question-count"),
    progressLabel: document.getElementById("progress-label"),
    progressFill: document.getElementById("progress-fill"),
    questionDimension: document.getElementById("question-dimension"),
    questionTheme: document.getElementById("question-theme"),
    questionTitle: document.getElementById("question-title"),
    choiceButtons: Array.prototype.slice.call(document.querySelectorAll(".choice-card")),
    resultCode: document.getElementById("result-title"),
    resultStrength: document.getElementById("result-strength"),
    resultSummary: document.getElementById("result-summary"),
    resultCacheKey: document.getElementById("result-cache-key"),
    signatureGraph: document.getElementById("signature-graph"),
    analysisParagraph: document.getElementById("analysis-paragraph"),
    exampleParagraph: document.getElementById("example-paragraph"),
    closingParagraph: document.getElementById("closing-paragraph"),
    shareCopy: document.getElementById("share-copy"),
    shareButton: document.getElementById("share-button"),
    retryButton: document.getElementById("retry-button"),
    revisitNote: document.getElementById("revisit-note")
  };

  function setStartButtonDisabled(disabled) {
    if (!elements.startButton) {
      return;
    }

    elements.startButton.disabled = disabled;
    elements.startButton.setAttribute("aria-disabled", String(disabled));
    elements.startButton.setAttribute("aria-busy", String(disabled));
  }

  function getStoredTheme() {
    var params = new URLSearchParams(window.location.search);
    var forcedMode = params.get("mode");
    var storedMode = window.localStorage.getItem(STORAGE_THEME_KEY);

    if (forcedMode === HIGH_CONTRAST) {
      return HIGH_CONTRAST;
    }

    return storedMode === HIGH_CONTRAST ? HIGH_CONTRAST : DEFAULT_THEME;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    elements.themeToggle.setAttribute("aria-checked", String(theme === HIGH_CONTRAST));
  }

  function persistTheme(theme) {
    window.localStorage.setItem(STORAGE_THEME_KEY, theme);
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
  }

  function setLoadStatus(message) {
    elements.loadStatus.textContent = message || "";
  }

  function showFatalMessage(message) {
    setLoadStatus(message);
  }

  function hideFatalMessage() {
    setLoadStatus("");
  }

  function getKstDateInfo(date) {
    var formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    var dateParts = formatter.formatToParts(date);
    var year = dateParts.find(function (part) { return part.type === "year"; }).value;
    var month = dateParts.find(function (part) { return part.type === "month"; }).value;
    var day = dateParts.find(function (part) { return part.type === "day"; }).value;
    var dateString = year + "-" + month + "-" + day;
    var nextMidnightKstUtc = Date.UTC(Number(year), Number(month) - 1, Number(day) + 1, 15, 0, 0);

    return {
      dateString: dateString,
      nextAvailableAt: new Date(nextMidnightKstUtc).toISOString()
    };
  }

  function fetchJsonOrThrow(path) {
    console.log("[LoveType] fetch start:", path, "protocol:", window.location.protocol);

    return fetch(path, { cache: "no-store" })
      .then(function (response) {
        console.log("[LoveType] fetch status:", path, response.status);

        if (!response.ok) {
          throw new Error(path + " -> HTTP " + response.status);
        }

        return response.json();
      })
      .catch(function (error) {
        throw new Error(path + " load failed: " + error.message);
      });
  }

  function loadDataFiles() {
    var files = [
      "lovetype_questions.json",
      "base_result.json",
      "axis_modifier.json",
      "share_copy.json"
    ];
    var loaded = {};
    var failedFiles = [];

    console.log("[LoveType] protocol:", window.location.protocol);

    return files.reduce(function (promise, file) {
      return promise.then(function () {
        return fetchJsonOrThrow("./" + file)
          .then(function (data) {
            loaded[file] = data;
            console.log("[LoveType][OK]", file);
          })
          .catch(function (error) {
            console.error("[LoveType][FAIL]", file, error.message);
            failedFiles.push(file);
          });
      });
    }, Promise.resolve()).then(function () {
      console.log("[LoveType] failed files:", failedFiles);

      if (failedFiles.length > 0) {
        var isFileProtocol = window.location.protocol === "file:";
        var extraMessage = isFileProtocol
          ? "브라우저에서 파일을 직접 열면(file://) JSON 로딩이 차단될 수 있어요. 로컬 서버 또는 배포 주소에서 열어야 해요."
          : "배포 경로 또는 파일 경로를 확인해야 해요.";

        showFatalMessage(
          "필수 데이터 파일을 불러오지 못했어요.\n"
          + "실패한 파일: " + failedFiles.join(", ") + "\n"
          + extraMessage
        );
        setStartButtonDisabled(true);
        return false;
      }

      state.questionsData = loaded["lovetype_questions.json"];
      state.baseResults = loaded["base_result.json"];
      state.axisModifiers = loaded["axis_modifier.json"];
      state.shareCopy = loaded["share_copy.json"];
      elements.metaQuestionCount.textContent = state.questionsData.totalQuestions + "문항";
      hideFatalMessage();
      setStartButtonDisabled(false);
      return true;
    });
  }

  function resetTestState() {
    state.currentQuestionIndex = 0;
    state.answers = [];
    state.resultPayload = null;
  }

  function startTest() {
    if (!state.questionsData) {
      setLoadStatus("문항 데이터를 준비하는 중이에요.");
      return;
    }

    resetTestState();
    setLoadStatus("");
    showScreen("question");
    renderQuestion();
  }

  function renderQuestion() {
    var question = state.questionsData.questions[state.currentQuestionIndex];
    var questionNumber = state.currentQuestionIndex + 1;
    var progressPercent = (questionNumber / state.questionsData.totalQuestions) * 100;

    elements.progressLabel.textContent = questionNumber + " / " + state.questionsData.totalQuestions;
    elements.progressFill.style.width = progressPercent + "%";
    elements.questionDimension.textContent = question.dimension + " 축";
    elements.questionTheme.textContent = question.theme;
    elements.questionTitle.textContent = question.question;

    elements.choiceButtons.forEach(function (button, index) {
      button.textContent = question.options[index].text;
      button.setAttribute("aria-label", question.options[index].text);
    });

    elements.choiceButtons[0].focus();
  }

  function extractChoiceLetter(scoreObject) {
    return Object.keys(scoreObject)[0];
  }

  function buildAnswerRecord(question, option) {
    return {
      questionId: question.id,
      axis: question.dimension,
      choice: extractChoiceLetter(option.score)
    };
  }

  function handleChoice(index) {
    var question = state.questionsData.questions[state.currentQuestionIndex];
    var option = question.options[index];

    state.answers.push(buildAnswerRecord(question, option));

    if (state.currentQuestionIndex === state.questionsData.questions.length - 1) {
      finalizeTest();
      return;
    }

    state.currentQuestionIndex += 1;
    renderQuestion();
  }

  function countAxisScores(answers) {
    return answers.reduce(function (accumulator, answer) {
      accumulator[answer.axis][answer.choice] = (accumulator[answer.axis][answer.choice] || 0) + 1;
      return accumulator;
    }, {
      EI: { E: 0, I: 0 },
      SN: { S: 0, N: 0 },
      TF: { T: 0, F: 0 },
      JP: { J: 0, P: 0 }
    });
  }

  function buildAxisStrength(axisName, axisScores) {
    var letters = AXIS_META[axisName].letters;
    var leftLetter = letters[0];
    var rightLetter = letters[1];
    var leftScore = axisScores[leftLetter];
    var rightScore = axisScores[rightLetter];
    var winner = leftScore >= rightScore ? leftLetter : rightLetter;
    var loser = winner === leftLetter ? rightLetter : leftLetter;
    var winnerScore = axisScores[winner];
    var loserScore = axisScores[loser];

    return {
      winner: winner,
      level: winnerScore >= 4 ? "strong" : "weak",
      raw: winner + winnerScore + ":" + loser + loserScore
    };
  }

  function buildGraphValue(axisName, axisStrength, axisScores) {
    var winnerScore = axisScores[axisStrength.winner];
    var absoluteValue;

    if (axisStrength.level === "weak") {
      absoluteValue = POSITIVE_VALUES.weak;
    } else if (winnerScore === 5) {
      absoluteValue = POSITIVE_VALUES.strong_5_0;
    } else {
      absoluteValue = POSITIVE_VALUES.strong_4_1;
    }

    return axisStrength.winner === POSITIVE_LETTER_BY_AXIS[axisName] ? absoluteValue : -absoluteValue;
  }

  function buildCacheKey(mbti, axisStrength) {
    return [
      mbti,
      "EI=" + axisStrength.EI.winner + "_" + axisStrength.EI.level,
      "SN=" + axisStrength.SN.winner + "_" + axisStrength.SN.level,
      "TF=" + axisStrength.TF.winner + "_" + axisStrength.TF.level,
      "JP=" + axisStrength.JP.winner + "_" + axisStrength.JP.level,
      "v1"
    ].join("__");
  }

  function replacePlaceholders(template, values) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      return values[key] || "";
    });
  }

  function composeResultText(mbti, axisStrength) {
    var base = state.baseResults.results[mbti];
    var modifiers = state.axisModifiers.modifiers;
    var modifierKeys = {
      EI: axisStrength.EI.winner + "_" + axisStrength.EI.level,
      SN: axisStrength.SN.winner + "_" + axisStrength.SN.level,
      TF: axisStrength.TF.winner + "_" + axisStrength.TF.level,
      JP: axisStrength.JP.winner + "_" + axisStrength.JP.level
    };
    var summary = base.summary + ". " + modifiers.EI[modifierKeys.EI];
    var analysisParagraph = [base.base_description, modifiers.EI[modifierKeys.EI], modifiers.SN[modifierKeys.SN]].join(" ");
    var exampleParagraph = [base.relationship_example, modifiers.TF[modifierKeys.TF], modifiers.JP[modifierKeys.JP]].join(" ");
    var closingParagraph = [base.closing_guidance, "LoveType 기준 이 조합은 " + modifierKeys.EI + ", " + modifierKeys.SN + ", " + modifierKeys.TF + ", " + modifierKeys.JP + "의 결을 가집니다."].join(" ");
    var template = state.shareCopy.templates[mbti] || state.shareCopy.default;

    return {
      summary: summary,
      analysis_paragraph: analysisParagraph,
      example_paragraph: exampleParagraph,
      closing_paragraph: closingParagraph,
      share_text: replacePlaceholders(template, { mbti: mbti, summary: base.summary })
    };
  }

  function buildLocalApiResponse(requestBody) {
    var axisScores = countAxisScores(requestBody.answers);
    var axisStrength = {
      EI: buildAxisStrength("EI", axisScores.EI),
      SN: buildAxisStrength("SN", axisScores.SN),
      TF: buildAxisStrength("TF", axisScores.TF),
      JP: buildAxisStrength("JP", axisScores.JP)
    };
    var mbti = [
      axisStrength.EI.winner,
      axisStrength.SN.winner,
      axisStrength.TF.winner,
      axisStrength.JP.winner
    ].join("");
    var graphValues = {
      EI: buildGraphValue("EI", axisStrength.EI, axisScores.EI),
      SN: buildGraphValue("SN", axisStrength.SN, axisScores.SN),
      TF: buildGraphValue("TF", axisStrength.TF, axisScores.TF),
      JP: buildGraphValue("JP", axisStrength.JP, axisScores.JP)
    };

    return {
      mbti: mbti,
      axis_scores: axisScores,
      axis_strength: axisStrength,
      graph_values: graphValues,
      cache_key: buildCacheKey(mbti, axisStrength),
      result_version: "1.0.0",
      result: composeResultText(mbti, axisStrength)
    };
  }

  function requestResultFromApi(requestBody) {
    return fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("API 응답 실패");
      }

      state.apiMode = "server";
      return response.json();
    }).catch(function () {
      state.apiMode = "local-fallback";
      return buildLocalApiResponse(requestBody);
    });
  }

  function buildResultRequest() {
    return {
      answers: state.answers
    };
  }

  function saveResultPayload(payload) {
    var todayInfo = getKstDateInfo(new Date());
    var axisStrengthFlat = {
      EI: payload.axis_strength.EI.winner + "_" + payload.axis_strength.EI.level,
      SN: payload.axis_strength.SN.winner + "_" + payload.axis_strength.SN.level,
      TF: payload.axis_strength.TF.winner + "_" + payload.axis_strength.TF.level,
      JP: payload.axis_strength.JP.winner + "_" + payload.axis_strength.JP.level
    };

    window.localStorage.setItem(STORAGE_RESULT_PAYLOAD_KEY, JSON.stringify(payload));
    window.localStorage.setItem(STORAGE_COMPLETED_DATE_KEY, todayInfo.dateString);
    window.localStorage.setItem(STORAGE_RESULT_KEY, payload.mbti);
    window.localStorage.setItem(STORAGE_AXIS_KEY, JSON.stringify(payload.axis_scores));
    window.localStorage.setItem(STORAGE_AXIS_STRENGTH_KEY, JSON.stringify(axisStrengthFlat));
    window.localStorage.setItem(STORAGE_GRAPH_KEY, JSON.stringify(payload.graph_values));
    window.localStorage.setItem(STORAGE_CACHE_KEY, payload.cache_key);
    window.localStorage.setItem(STORAGE_VERSION_KEY, payload.result_version);
    window.localStorage.setItem(STORAGE_SUMMARY_KEY, payload.result.summary);
    window.localStorage.setItem(STORAGE_DETAIL_KEY, JSON.stringify(payload.result));
    window.localStorage.setItem(STORAGE_NEXT_AVAILABLE_KEY, todayInfo.nextAvailableAt);
  }

  function getStoredResultPayload() {
    var completedDate = window.localStorage.getItem(STORAGE_COMPLETED_DATE_KEY);
    var today = getKstDateInfo(new Date()).dateString;
    var payloadText = window.localStorage.getItem(STORAGE_RESULT_PAYLOAD_KEY);

    if (completedDate !== today || !payloadText) {
      return null;
    }

    return JSON.parse(payloadText);
  }

  function buildStrengthDisplay(axisStrength) {
    return ["EI", "SN", "TF", "JP"].map(function (axisName) {
      return axisStrength[axisName].winner + " " + axisStrength[axisName].level;
    }).join(" / ");
  }

  function buildGraphAxis(axisName, payload) {
    var graphAxis = document.createElement("div");
    graphAxis.className = "graph-axis";

    var axisMeta = AXIS_META[axisName];
    var positiveLetter = POSITIVE_LETTER_BY_AXIS[axisName];
    var negativeLetter = axisMeta.letters[0] === positiveLetter ? axisMeta.letters[1] : axisMeta.letters[0];
    var value = payload.graph_values[axisName];
    var pointPosition = 50 - (value / 2);

    graphAxis.innerHTML = [
      '<span class="graph-axis-name">' + axisName + "</span>",
      '<div class="graph-letters"><span>' + axisMeta.labels[positiveLetter] + "</span><span>" + axisMeta.labels[negativeLetter] + "</span></div>",
      '<div class="graph-rail" role="img" aria-label="' + axisName + " 값 " + value + '"><span class="graph-point" style="top:' + pointPosition + '%;"></span></div>',
      '<span class="graph-raw">' + payload.axis_strength[axisName].raw + "</span>"
    ].join("");

    return graphAxis;
  }

  function renderSignatureGraph(payload) {
    elements.signatureGraph.innerHTML = "";
    ["EI", "SN", "TF", "JP"].forEach(function (axisName) {
      elements.signatureGraph.appendChild(buildGraphAxis(axisName, payload));
    });
  }

  function renderResult(payload, isLocked) {
    state.resultPayload = payload;
    showScreen("result");
    elements.resultCode.textContent = payload.mbti;
    elements.resultStrength.textContent = buildStrengthDisplay(payload.axis_strength);
    elements.resultSummary.textContent = payload.result.summary;
    elements.resultCacheKey.textContent = payload.cache_key;
    elements.analysisParagraph.textContent = payload.result.analysis_paragraph;
    elements.exampleParagraph.textContent = payload.result.example_paragraph;
    elements.closingParagraph.textContent = payload.result.closing_paragraph;
    elements.shareCopy.textContent = payload.result.share_text;
    elements.revisitNote.hidden = !isLocked;
    elements.retryButton.disabled = isLocked;
    renderSignatureGraph(payload);
  }

  function finalizeTest() {
    setLoadStatus("LoveType 결과를 분석하는 중이에요.");

    requestResultFromApi(buildResultRequest())
      .then(function (payload) {
        saveResultPayload(payload);
        setLoadStatus("");
        renderResult(payload, true);
      })
      .catch(function () {
        setLoadStatus("결과를 생성하지 못했어요. 잠시 후 다시 시도해주세요.");
        showScreen("landing");
      });
  }

  function shareResult() {
    if (!state.resultPayload) {
      return;
    }

    var shareText = state.resultPayload.result.share_text + "\n" + state.resultPayload.cache_key;

    if (navigator.share) {
      navigator.share({
        title: "LoveType 결과",
        text: shareText,
        url: window.location.href
      }).catch(function () {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(function () {
        window.alert("공유 문구를 복사했어요.");
      }).catch(function () {
        window.alert(shareText);
      });
      return;
    }

    window.alert(shareText);
  }

  function initializeTheme() {
    applyTheme(getStoredTheme());

    elements.themeToggle.addEventListener("click", function () {
      var nextTheme = document.documentElement.getAttribute("data-theme") === HIGH_CONTRAST
        ? DEFAULT_THEME
        : HIGH_CONTRAST;

      applyTheme(nextTheme);
      persistTheme(nextTheme);
    });
  }

  function initializeEvents() {
    elements.startButton.addEventListener("click", startTest);
    elements.choiceButtons.forEach(function (button, index) {
      button.addEventListener("click", function () {
        handleChoice(index);
      });
    });
    elements.shareButton.addEventListener("click", shareResult);
  }

  function initializeFlow() {
    var storedPayload = getStoredResultPayload();

    if (storedPayload) {
      renderResult(storedPayload, true);
      return;
    }

    showScreen("landing");
  }

  function initializeApp() {
    var isFileProtocol = window.location.protocol === "file:";

    setStartButtonDisabled(true);
    setLoadStatus("LoveType 정식 데이터와 해석 구조를 불러오는 중이에요.");

    if (isFileProtocol) {
      showFatalMessage(
        "브라우저에서 파일을 직접 열면(file://) 데이터 로딩이 차단될 수 있어요.\n"
        + "로컬 서버 또는 배포 주소에서 열어야 정상 동작해요."
      );
    }

    loadDataFiles()
      .then(function (loaded) {
        if (!loaded) {
          return;
        }

        initializeFlow();
      })
      .catch(function () {
        showFatalMessage("필수 데이터 파일을 불러오는 중 알 수 없는 오류가 발생했어요.");
        setStartButtonDisabled(true);
      });
  }

  initializeTheme();
  initializeEvents();
  initializeApp();

  // Extension point: replace local fallback with server-only mode after API rollout.
  // Extension point: move result payload caching to a dedicated storage module.
})();
