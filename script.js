(function () {
  var STORAGE_THEME_KEY = "theme_mode";
  var STORAGE_RESULT_PAYLOAD_KEY = "lovetype_result_payload";
  var STORAGE_COMPLETED_DATE_KEY = "completed_date";
  var STORAGE_DAILY_COUNT_KEY = "daily_count";
  var STORAGE_RESULT_KEY = "mbti_result";
  var STORAGE_AXIS_KEY = "axis_scores";
  var STORAGE_AXIS_STRENGTH_KEY = "axis_strength";
  var STORAGE_GRAPH_KEY = "graph_values";
  var STORAGE_CACHE_KEY = "cache_key";
  var STORAGE_VERSION_KEY = "result_version";
  var STORAGE_SUMMARY_KEY = "result_summary";
  var STORAGE_DETAIL_KEY = "result_detail";
  var STORAGE_NEXT_AVAILABLE_KEY = "next_available_at";
  var APP_VERSION = "1.2.2";
  var DAILY_LIMIT = 3;

  var HIGH_CONTRAST = "hc";
  var DEFAULT_THEME = "default";
  var API_BASE_URL = "https://lovetype-api-production.up.railway.app";
  var API_ENDPOINT = API_BASE_URL + "/api/mbti-test/result";
  var AXIS_SEQUENCE = ["EI", "SN", "TF", "JP"];
  var GRAPH_LABELS = {
    EI: "관계 에너지",
    SN: "인식 결",
    TF: "감정 판단",
    JP: "관계 리듬"
  };
  var GRAPH_STATE_LABELS = {
    strongPositive: "선명",
    weakPositive: "기울어짐",
    weakNegative: "잔잔",
    strongNegative: "깊음"
  };
  var POSITIVE_VALUES = {
    strong_4_1: 72,
    strong_5_0: 100,
    weak: 38
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
    renderedQuestions: [],
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
    lineGraph: document.getElementById("line-graph"),
    analysisParagraph: document.getElementById("analysis-paragraph"),
    exampleParagraph: document.getElementById("example-paragraph"),
    closingParagraph: document.getElementById("closing-paragraph"),
    shareCopy: document.getElementById("share-copy"),
    shareButton: document.getElementById("share-button"),
    revisitLink: document.getElementById("revisit-link"),
    storyLink: document.getElementById("story-link"),
    revisitNote: document.getElementById("revisit-note"),
    headerShareBtn: document.getElementById("header-share-btn")
  };

  function setStartButtonDisabled(disabled) {
    if (!elements.startButton) {
      return;
    }

    elements.startButton.disabled = disabled;
    elements.startButton.setAttribute("aria-disabled", String(disabled));
    elements.startButton.setAttribute("aria-busy", String(disabled));
  }

  function getSessionId() {
    var sessionId = window.localStorage.getItem("lovetype_session_id");
    if (!sessionId) {
      sessionId = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
      window.localStorage.setItem("lovetype_session_id", sessionId);
    }
    return sessionId;
  }

  function logEvent(eventType, eventValue, step) {
    fetch(API_BASE_URL + "/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        app_id: "lovetype",
        event_type: eventType,
        event_value: eventValue || null,
        step: step || null
      })
    }).catch(function () {});
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

  function checkDailyLimit() {
    var todayString = getKstDateInfo(new Date()).dateString;
    var savedDate = window.localStorage.getItem(STORAGE_COMPLETED_DATE_KEY);
    var savedCount = parseInt(window.localStorage.getItem(STORAGE_DAILY_COUNT_KEY) || "0", 10);

    if (savedDate !== todayString) {
      window.localStorage.setItem(STORAGE_COMPLETED_DATE_KEY, todayString);
      window.localStorage.setItem(STORAGE_DAILY_COUNT_KEY, "0");
      return true;
    }

    return savedCount < DAILY_LIMIT;
  }

  function incrementDailyCount() {
    var savedCount = parseInt(window.localStorage.getItem(STORAGE_DAILY_COUNT_KEY) || "0", 10);
    window.localStorage.setItem(STORAGE_DAILY_COUNT_KEY, String(savedCount + 1));
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
    var nextMidnightKstUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), 15, 0, 0);

    return {
      dateString: dateString,
      nextAvailableAt: new Date(nextMidnightKstUtc).toISOString()
    };
  }

  function fetchJsonOrThrow(path) {
    return fetch(path, { cache: "no-store" })
      .then(function (response) {
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

    return files.reduce(function (promise, file) {
      return promise.then(function () {
        return fetchJsonOrThrow("./" + file + "?v=" + APP_VERSION)
          .then(function (data) {
            loaded[file] = data;
          })
          .catch(function () {
            failedFiles.push(file);
          });
      });
    }, Promise.resolve()).then(function () {
      if (failedFiles.length > 0) {
        var isFileProtocol = window.location.protocol === "file:";
        var extraMessage = isFileProtocol
          ? "브라우저에서 file:// 경로로 열면 JSON 로딩이 차단될 수 있어요. 로컬 서버나 배포 주소에서 실행해 주세요."
          : "배포 경로 또는 파일 위치를 확인해 주세요.";

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
    state.renderedQuestions = [];
  }

  function randomizeArray(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var randomIndex = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[randomIndex];
      copy[randomIndex] = temp;
    }
    return copy;
  }

  function normalizeQuestion(question) {
    return {
      questionId: question.questionId,
      axis: question.axis,
      theme: question.theme,
      prompt: question.prompt,
      options: randomizeArray(question.options)
    };
  }

  function chooseNextAxis(queues, previousAxes) {
    var availableAxes = AXIS_SEQUENCE.filter(function (axis) {
      return queues[axis].length > 0;
    });

    var filteredAxes = availableAxes.filter(function (axis) {
      return previousAxes.indexOf(axis) === -1;
    });
    var candidateAxes = filteredAxes.length > 0 ? filteredAxes : availableAxes;
    var maxRemaining = Math.max.apply(null, candidateAxes.map(function (axis) {
      return queues[axis].length;
    }));
    var strongestAxes = candidateAxes.filter(function (axis) {
      return queues[axis].length === maxRemaining;
    });

    return strongestAxes[Math.floor(Math.random() * strongestAxes.length)];
  }

  function buildShuffledQuestions(questions) {
    var queues = {
      EI: [],
      SN: [],
      TF: [],
      JP: []
    };
    var ordered = [];
    var previousAxes = [];

    questions.forEach(function (question) {
      queues[question.axis].push(normalizeQuestion(question));
    });

    Object.keys(queues).forEach(function (axis) {
      queues[axis] = randomizeArray(queues[axis]);
    });

    while (ordered.length < questions.length) {
      var nextAxis = chooseNextAxis(queues, previousAxes.slice(-1));
      ordered.push(queues[nextAxis].shift());
      previousAxes.push(nextAxis);
    }

    return ordered;
  }

  function startTest() {
    if (!state.questionsData) {
      setLoadStatus("문항 데이터를 준비하는 중이에요.");
      return;
    }

    if (!checkDailyLimit()) {
      setLoadStatus("오늘은 최대 3번까지 테스트할 수 있어요. 내일 자정 이후에 다시 도전해보세요.");
      return;
    }

    logEvent("test_start");
    hideHeaderShareBtn();
    resetTestState();
    state.renderedQuestions = buildShuffledQuestions(state.questionsData.questions);
    hideFatalMessage();
    showScreen("question");
    renderQuestion();
  }

  function renderQuestion() {
    var question = state.renderedQuestions[state.currentQuestionIndex];
    var questionNumber = state.currentQuestionIndex + 1;
    var progressPercent = (questionNumber / state.questionsData.totalQuestions) * 100;
    var dimensionLabel = state.questionsData.dimensions[question.axis] || question.axis;

    elements.progressLabel.textContent = questionNumber + " / " + state.questionsData.totalQuestions;
    elements.progressFill.style.width = progressPercent + "%";
    elements.questionDimension.textContent = question.axis + " · " + dimensionLabel;
    elements.questionTheme.textContent = question.theme;
    elements.questionTitle.textContent = question.prompt;

    elements.choiceButtons.forEach(function (button, index) {
      var option = question.options[index];
      button.textContent = option.label;
      button.setAttribute("aria-label", option.label);
      button.dataset.choiceId = option.id;
      button.dataset.choiceIndex = String(index);
    });

    elements.choiceButtons[0].focus();
  }

  function handleChoice(index) {
    var question = state.renderedQuestions[state.currentQuestionIndex];
    var option = question.options[index];

    state.answers.push({
      questionId: question.questionId,
      axis: option.axis,
      choice: option.value
    });

    if (state.currentQuestionIndex === state.renderedQuestions.length - 1) {
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
      raw: winner + " " + winnerScore + ":" + loserScore + " " + loser
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

  function sanitizeResultField(value, fallback) {
    if (!value || /\?/.test(value)) {
      return fallback;
    }

    return value;
  }

  function composeResultText(mbti, axisStrength) {
    var base = state.baseResults && state.baseResults.results
      ? state.baseResults.results[mbti]
      : null;
    var modifiers = state.axisModifiers && state.axisModifiers.modifiers
      ? state.axisModifiers.modifiers
      : null;
    var modifierKeys = {
      EI: axisStrength.EI.winner + "_" + axisStrength.EI.level,
      SN: axisStrength.SN.winner + "_" + axisStrength.SN.level,
      TF: axisStrength.TF.winner + "_" + axisStrength.TF.level,
      JP: axisStrength.JP.winner + "_" + axisStrength.JP.level
    };
    var shareTemplate = state.shareCopy && state.shareCopy.templates
      ? (state.shareCopy.templates[mbti] || state.shareCopy.default || "{mbti} {summary}")
      : "{mbti} {summary}";

    if (!base || !modifiers) {
      return {
        summary: mbti + " 타입의 연애 흐름을 분석했어요.",
        analysis_paragraph: "관계가 시작될 때의 에너지와 상대를 읽는 결, 감정을 다루는 방식, 관계의 리듬을 함께 살펴본 결과예요.",
        example_paragraph: "강약 판정은 각 축의 5:0, 4:1을 strong, 3:2를 weak로 유지해 현재의 연애 결을 더 또렷하게 보여줘요.",
        closing_paragraph: "오늘의 LoveType 결과를 바탕으로 당신이 사람과 가까워지는 방식과 안정감을 느끼는 흐름을 읽어냈어요.",
        share_text: replacePlaceholders(shareTemplate, { mbti: mbti, summary: mbti + " 타입의 연애 흐름" })
      };
    }

    var summary = sanitizeResultField(base.summary, mbti + " 타입의 연애 흐름을 분석했어요.");
    var baseDescription = sanitizeResultField(base.base_description, "관계가 시작되고 깊어지는 방식에서 드러나는 기본 결을 읽어냈어요.");
    var relationshipExample = sanitizeResultField(base.relationship_example, "상대와 가까워질 때 어떤 장면에서 마음이 움직이는지 함께 살펴봤어요.");
    var closingGuidance = sanitizeResultField(base.closing_guidance, "지금의 결과는 오늘 당신의 연애 리듬을 보여주는 한 장면이에요.");
    var eiModifier = sanitizeResultField(modifiers.EI[modifierKeys.EI], "");
    var snModifier = sanitizeResultField(modifiers.SN[modifierKeys.SN], "");
    var tfModifier = sanitizeResultField(modifiers.TF[modifierKeys.TF], "");
    var jpModifier = sanitizeResultField(modifiers.JP[modifierKeys.JP], "");

    return {
      summary: summary,
      analysis_paragraph: [baseDescription, eiModifier, snModifier].join(" ").trim(),
      example_paragraph: [relationshipExample, tfModifier, jpModifier].join(" ").trim(),
      closing_paragraph: [closingGuidance, "LoveType 강약 판정은 " + modifierKeys.EI + ", " + modifierKeys.SN + ", " + modifierKeys.TF + ", " + modifierKeys.JP + " 조합으로 계산했어요."].join(" "),
      share_text: replacePlaceholders(shareTemplate, { mbti: mbti, summary: summary })
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
      result_version: APP_VERSION,
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
    var payloadText = window.localStorage.getItem(STORAGE_RESULT_PAYLOAD_KEY);
    var storedVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);

    if (!payloadText || storedVersion !== APP_VERSION) {
      return null;
    }

    return JSON.parse(payloadText);
  }

  function buildStrengthDisplay(axisStrength) {
    return AXIS_SEQUENCE.map(function (axisName) {
      var winner = axisStrength[axisName].winner;
      var label = AXIS_META[axisName].labels[winner];
      return GRAPH_LABELS[axisName] + " " + winner + " " + axisStrength[axisName].level + " (" + label + ")";
    }).join(" / ");
  }

  function getGraphPointState(value) {
    if (value >= POSITIVE_VALUES.strong_4_1) {
      return GRAPH_STATE_LABELS.strongPositive;
    }
    if (value > 0) {
      return GRAPH_STATE_LABELS.weakPositive;
    }
    if (value <= -POSITIVE_VALUES.strong_4_1) {
      return GRAPH_STATE_LABELS.strongNegative;
    }

    return GRAPH_STATE_LABELS.weakNegative;
  }

  function mapGraphPoint(axisName, value, index, total) {
    var width = 760;
    var height = 420;
    var paddingLeft = 96;
    var paddingRight = 36;
    var paddingTop = 42;
    var paddingBottom = 96;
    var plotWidth = width - paddingLeft - paddingRight;
    var plotHeight = height - paddingTop - paddingBottom;
    var centerY = paddingTop + plotHeight / 2;
    var x = paddingLeft + (plotWidth / (total - 1)) * index;
    var y = centerY - ((value / 100) * (plotHeight / 2));

    return {
      x: x,
      y: y,
      axis: axisName,
      value: value
    };
  }

  function buildGraphStatusLabel(axisName, payload) {
    var axisStrength = payload.axis_strength[axisName];
    var label = AXIS_META[axisName].labels[axisStrength.winner];
    return axisStrength.winner + " · " + label + " · " + axisStrength.level;
  }

  function renderLineGraph(payload) {
    var width = 760;
    var height = 420;
    var yGuides = [100, 50, 0, -50, -100];
    var guideLabels = {
      100: "Strong +",
      50: "Weak +",
      0: "균형",
      "-50": "Weak -",
      "-100": "Strong -"
    };
    var points = AXIS_SEQUENCE.map(function (axisName, index) {
      return mapGraphPoint(axisName, payload.graph_values[axisName], index, AXIS_SEQUENCE.length);
    });
    var polylinePoints = points.map(function (point) {
      return point.x + "," + point.y;
    }).join(" ");
    var svgParts = [
      '<svg class="graph-svg" viewBox="0 0 ' + width + " " + height + '" aria-hidden="true">'
    ];

    yGuides.forEach(function (guide) {
      var guidePoint = mapGraphPoint("guide", guide, 0, AXIS_SEQUENCE.length);
      var lineClass = guide === 0 ? "graph-mid-line" : "graph-guide-line";
      svgParts.push('<line class="' + lineClass + '" x1="96" y1="' + guidePoint.y + '" x2="724" y2="' + guidePoint.y + '"></line>');
      svgParts.push('<text class="graph-guide-label" x="22" y="' + (guidePoint.y + 5) + '">' + guideLabels[String(guide)] + "</text>");
    });

    points.forEach(function (point) {
      svgParts.push('<line class="graph-axis-line" x1="' + point.x + '" y1="42" x2="' + point.x + '" y2="324"></line>');
    });

    svgParts.push('<polyline class="graph-polyline" points="' + polylinePoints + '"></polyline>');

    points.forEach(function (point) {
      var pointClass = point.value >= 0 ? "graph-point graph-point-positive" : "graph-point graph-point-negative";
      var bubbleY = point.y <= 76 ? point.y + 34 : point.y - 26;
      svgParts.push('<circle class="' + pointClass + '" cx="' + point.x + '" cy="' + point.y + '" r="11"></circle>');
      svgParts.push('<text class="graph-point-value" x="' + point.x + '" y="' + bubbleY + '">' + buildGraphStatusLabel(point.axis, payload) + "</text>");
    });

    AXIS_SEQUENCE.forEach(function (axisName, index) {
      var xPoint = mapGraphPoint(axisName, 0, index, AXIS_SEQUENCE.length).x;
      svgParts.push('<text class="graph-axis-label" x="' + xPoint + '" y="360">' + axisName + "</text>");
      svgParts.push('<text class="graph-axis-caption" x="' + xPoint + '" y="387">' + GRAPH_LABELS[axisName] + "</text>");
      svgParts.push('<text class="graph-axis-raw" x="' + xPoint + '" y="409">' + payload.axis_strength[axisName].raw + "</text>");
    });

    svgParts.push("</svg>");

    elements.lineGraph.innerHTML = [
      '<div class="graph-intro">',
      '<p class="graph-headline">네 축의 방향과 강도가 하나의 흐름으로 이어집니다.</p>',
      '<p class="graph-copy">양수는 ' + AXIS_META.EI.labels.E + "/" + AXIS_META.SN.labels.S + "/" + AXIS_META.TF.labels.T + "/" + AXIS_META.JP.labels.J + ' 쪽, 음수는 반대 축을 뜻해요.</p>',
      "</div>",
      '<div class="graph-shell">' + svgParts.join("") + "</div>",
      '<div class="graph-status-row">' + AXIS_SEQUENCE.map(function (axisName) {
        return '<div class="graph-status-card"><strong>' + axisName + '</strong><span>' + buildGraphStatusLabel(axisName, payload) + '</span><em>' + getGraphPointState(payload.graph_values[axisName]) + "</em></div>";
      }).join("") + "</div>"
    ].join("");
  }

  function renderCompatibility(data, loading, result) {
    document.getElementById("compat-best-type").textContent = data.best.type;
    document.getElementById("compat-best-reason").textContent = data.best.reason;
    document.getElementById("compat-unexpected-type").textContent = data.unexpected.type;
    document.getElementById("compat-unexpected-reason").textContent = data.unexpected.reason;
    document.getElementById("compat-caution-type").textContent = data.caution.type;
    document.getElementById("compat-caution-reason").textContent = data.caution.reason;
    loading.hidden = true;
    result.hidden = false;
  }

  function loadCompatibility(mbti, axisStrength) {
    var section = document.querySelector(".compatibility-section");
    var loading = document.getElementById("compatibility-loading");
    var result = document.getElementById("compatibility-result");

    if (!section) {
      return;
    }

    section.hidden = false;

    var strengthStr = [
      axisStrength.EI.winner + "_" + axisStrength.EI.level,
      axisStrength.SN.winner + "_" + axisStrength.SN.level,
      axisStrength.TF.winner + "_" + axisStrength.TF.level,
      axisStrength.JP.winner + "_" + axisStrength.JP.level
    ].join("__");
    var cacheKey = "compat_cache_" + mbti + "__" + strengthStr;
    var cached = window.localStorage.getItem(cacheKey);

    if (cached) {
      try {
        renderCompatibility(JSON.parse(cached), loading, result);
        return;
      } catch (e) {
        window.localStorage.removeItem(cacheKey);
      }
    }

    var axisStrengthFlat = {
      EI: axisStrength.EI.winner + "_" + axisStrength.EI.level,
      SN: axisStrength.SN.winner + "_" + axisStrength.SN.level,
      TF: axisStrength.TF.winner + "_" + axisStrength.TF.level,
      JP: axisStrength.JP.winner + "_" + axisStrength.JP.level
    };

    fetch(API_BASE_URL + "/api/mbti-test/compatibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mbti: mbti,
        axis_strength: axisStrengthFlat,
        app_id: "lovetype"
      })
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        window.localStorage.setItem(cacheKey, JSON.stringify(data));
        renderCompatibility(data, loading, result);
      })
      .catch(function (e) {
        loading.textContent = "AI 분석을 불러오지 못했어요.";
        console.warn("[API] compatibility 실패:", e.message);
      });
  }

  function generateResultCode(mbti, axisStrength, axisScores) {
    function strengthToNum(strengthStr, axisScore) {
      if (!strengthStr) {
        return 2;
      }
      if (strengthStr.indexOf("strong") !== -1) {
        if (axisScore !== undefined && axisScore !== null) {
          var values = Object.keys(axisScore).map(function (k) { return axisScore[k]; });
          var maxVal = Math.max.apply(null, values);
          return maxVal >= 5 ? 5 : 4;
        }
        return 4;
      }
      return 2;
    }

    var eiStr = axisStrength.EI ? axisStrength.EI.winner + "_" + axisStrength.EI.level : "";
    var snStr = axisStrength.SN ? axisStrength.SN.winner + "_" + axisStrength.SN.level : "";
    var tfStr = axisStrength.TF ? axisStrength.TF.winner + "_" + axisStrength.TF.level : "";
    var jpStr = axisStrength.JP ? axisStrength.JP.winner + "_" + axisStrength.JP.level : "";

    return (
      mbti[0] + strengthToNum(eiStr, axisScores && axisScores.EI) +
      mbti[1] + strengthToNum(snStr, axisScores && axisScores.SN) +
      mbti[2] + strengthToNum(tfStr, axisScores && axisScores.TF) +
      mbti[3] + strengthToNum(jpStr, axisScores && axisScores.JP)
    );
  }

  function showCopyToast(msg) {
    var existing = document.querySelector(".copy-toast");
    if (existing) {
      existing.remove();
    }
    var toast = document.createElement("div");
    toast.className = "copy-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.remove();
    }, 2500);
  }

  function copyResultCode(code) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () {
        showCopyToast("코드가 복사됐어요 🩷 타로앱에 붙여넣기 해보세요!");
      }).catch(function () {
        showCopyToast("코드가 복사됐어요 🩷");
      });
      return;
    }
    var el = document.createElement("textarea");
    el.value = code;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showCopyToast("코드가 복사됐어요 🩷");
  }

  function renderResultCode(code) {
    var el = document.getElementById("result-code-display");
    if (el) {
      el.textContent = code;
    }
    var btn = document.getElementById("result-code-copy-btn");
    if (btn) {
      btn.onclick = function () {
        copyResultCode(code);
      };
    }
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
    elements.revisitLink.setAttribute("href", "#result-screen");
    elements.storyLink.setAttribute("href", "#");
    renderLineGraph(payload);
    showHeaderShareBtn();
    renderResultCode(generateResultCode(payload.mbti, payload.axis_strength, payload.axis_scores));
    loadCompatibility(payload.mbti, payload.axis_strength);
  }

  function saveResultToAPI(payload) {
    var todayKST = getKstDateInfo(new Date()).dateString;
    var savedDate = window.localStorage.getItem("api_result_saved_date");
    if (savedDate === todayKST) {
      return;
    }

    var axisStrengthFlat = {
      EI: payload.axis_strength.EI.winner + "_" + payload.axis_strength.EI.level,
      SN: payload.axis_strength.SN.winner + "_" + payload.axis_strength.SN.level,
      TF: payload.axis_strength.TF.winner + "_" + payload.axis_strength.TF.level,
      JP: payload.axis_strength.JP.winner + "_" + payload.axis_strength.JP.level
    };

    fetch(API_BASE_URL + "/api/mbti-test/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        app_id: "lovetype",
        cache_key: payload.cache_key,
        mbti: payload.mbti,
        axis_strength: axisStrengthFlat,
        result_data: payload.result
      })
    }).then(function (res) {
      if (res.ok) {
        window.localStorage.setItem("api_result_saved_date", todayKST);
      }
    }).catch(function (e) {
      console.warn("[API] result 저장 실패 (로컬 계속):", e.message);
    });
  }

  function finalizeTest() {
    setLoadStatus("LoveType 결과를 분석하는 중이에요.");

    requestResultFromApi(buildResultRequest())
      .then(function (payload) {
        saveResultPayload(payload);
        saveResultToAPI(payload);
        incrementDailyCount();
        hideFatalMessage();
        logEvent("result_view", payload.mbti);
        renderResult(payload, !checkDailyLimit());
      })
      .catch(function () {
        showFatalMessage("결과를 생성하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
        showScreen("landing");
      });
  }

  function showHeaderShareBtn() {
    if (elements.headerShareBtn) {
      elements.headerShareBtn.hidden = false;
    }
  }

  function hideHeaderShareBtn() {
    if (elements.headerShareBtn) {
      elements.headerShareBtn.hidden = true;
    }
  }

  function shareResult() {
    if (!state.resultPayload) {
      return;
    }

    var shareText = state.resultPayload.result.share_text + "\n" + state.resultPayload.cache_key;
    logEvent("share_click");
    var shareUrl = "https://kuroicode-beep.github.io/lovetype/";

    if (navigator.share) {
      navigator.share({
        title: "나의 LoveType 결과",
        text: shareText,
        url: shareUrl
      }).catch(function () {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText + "\n" + shareUrl).then(function () {
        window.alert("공유 문구가 복사됐어요 🩷");
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
    if (elements.headerShareBtn) {
      elements.headerShareBtn.addEventListener("click", shareResult);
    }
    if (elements.storyLink) {
      elements.storyLink.addEventListener("click", function (e) {
        e.preventDefault();
        window.alert("현재 개발 중입니다. 조금만 기다려 주세요 🩷");
      });
    }
  }

  function initializeFlow() {
    logEvent("page_view");

    var todayString = getKstDateInfo(new Date()).dateString;
    var savedDate = window.localStorage.getItem(STORAGE_COMPLETED_DATE_KEY);
    var savedCount = parseInt(window.localStorage.getItem(STORAGE_DAILY_COUNT_KEY) || "0", 10);

    if (savedDate === todayString && savedCount >= DAILY_LIMIT) {
      var storedPayload = getStoredResultPayload();
      if (storedPayload) {
        logEvent("result_view", storedPayload.mbti);
        renderResult(storedPayload, true);
        return;
      }
    }

    showScreen("landing");
  }

  function initializeApp() {
    var isFileProtocol = window.location.protocol === "file:";

    setStartButtonDisabled(true);
    setLoadStatus("LoveType 질문과 결과 구조를 불러오는 중이에요.");

    if (isFileProtocol) {
      showFatalMessage(
        "브라우저에서 file:// 경로로 열면 데이터 로딩이 차단될 수 있어요.\n"
        + "로컬 서버나 배포 주소에서 실행해 주세요."
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
})();
