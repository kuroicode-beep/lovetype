(function () {
  var STORAGE_THEME_KEY = "theme_mode";
  var STORAGE_COMPLETED_DATE_KEY = "completed_date";
  var STORAGE_RESULT_KEY = "mbti_result";
  var STORAGE_AXIS_KEY = "axis_scores";
  var STORAGE_SUMMARY_KEY = "result_summary";
  var STORAGE_DETAIL_KEY = "result_detail";
  var STORAGE_NEXT_AVAILABLE_KEY = "next_available_at";

  var HIGH_CONTRAST = "hc";
  var DEFAULT_THEME = "default";
  var DATA_URL = "./lovetype.json";
  var AXIS_ORDER = ["EI", "SN", "TF", "JP"];
  var AXIS_META = {
    EI: {
      left: "E",
      right: "I",
      leftLabel: "외향",
      rightLabel: "내향"
    },
    SN: {
      left: "S",
      right: "N",
      leftLabel: "감각",
      rightLabel: "직관"
    },
    TF: {
      left: "T",
      right: "F",
      leftLabel: "사고",
      rightLabel: "감정"
    },
    JP: {
      left: "J",
      right: "P",
      leftLabel: "판단",
      rightLabel: "인식"
    }
  };

  var descriptionMap = {
    default: {
      summary: "감정의 흐름과 관계의 리듬을 함께 읽으면서, 사랑을 나답게 이어가려는 타입이에요.",
      style: "상대와의 템포를 살피며 친밀감을 쌓고, 마음이 통한다고 느끼는 순간 깊게 몰입하는 편이에요.",
      strength: "좋아하는 사람의 반응을 세심하게 읽고, 관계 안에서 분위기와 의미를 함께 만들어갈 수 있어요.",
      caution: "마음이 커질수록 해석이 앞서갈 수 있으니, 확신이 필요할 때는 감정보다 대화를 먼저 꺼내보세요."
    },
    ISTJ: {
      summary: "신뢰와 일관성으로 사랑을 쌓아가는, 차분한 현실형 연애 타입이에요.",
      style: "감정 표현은 크지 않아도 약속과 태도로 마음을 보여주며, 안정적인 관계를 오래 유지하는 편이에요.",
      strength: "관계를 실제 생활 속에서 단단하게 만들고, 믿을 수 있는 파트너가 되어줘요.",
      caution: "상대는 확실한 마음 표현을 원할 수 있으니, 행동뿐 아니라 말로도 애정을 전해보세요."
    },
    ISFJ: {
      summary: "조용하지만 깊게, 꾸준한 안정감으로 사랑을 지켜가는 타입이에요.",
      style: "상대가 편안함을 느끼는 순간을 잘 만들고, 작은 배려가 오래 남는 관계를 선호해요.",
      strength: "신뢰를 쌓는 속도가 안정적이고, 관계를 실제 생활 속에서 오래 지속시키는 힘이 있어요.",
      caution: "배려가 많은 만큼 서운함을 혼자 오래 안고 갈 수 있으니, 감정을 너무 늦게 말하지 않는 연습이 필요해요."
    },
    INFJ: {
      summary: "깊은 공감과 진정성으로 관계의 의미를 오래 바라보는 타입이에요.",
      style: "표면적인 설렘보다 마음의 결이 맞는지를 중요하게 여기며, 연결감이 생기면 깊이 헌신해요.",
      strength: "상대의 내면을 잘 읽고, 관계가 어디로 가는지 큰 그림으로 살필 수 있어요.",
      caution: "기대와 해석이 마음속에서 커질 수 있으니, 혼자 결론 내리기 전에 확인하는 대화가 필요해요."
    },
    INTJ: {
      summary: "신중하게 마음을 열지만, 한 번 선택하면 오래 가는 전략형 연애 타입이에요.",
      style: "감정보다 방향성과 합을 중요하게 보며, 관계의 구조가 맞을 때 깊이 몰입해요.",
      strength: "관계를 장기적으로 보고 현실적인 균형을 잡는 데 강해요.",
      caution: "정확함에 집중하다 보면 차갑게 보일 수 있으니, 마음의 온도를 조금 더 드러내면 좋아요."
    },
    ISTP: {
      summary: "자유롭고 담백하지만, 필요할 때는 누구보다 든든한 연애 타입이에요.",
      style: "과한 규칙 없이 편안한 흐름을 선호하고, 함께 경험을 쌓으며 가까워지는 편이에요.",
      strength: "상황 변화에 유연하고, 상대가 답답하지 않도록 자연스러운 공간을 만들어줘요.",
      caution: "감정 대화가 늦어질 수 있으니, 중요한 장면에서는 회피보다 표현을 먼저 선택해보세요."
    },
    ISFP: {
      summary: "부드러운 감수성과 편안한 온도로 사랑을 표현하는 타입이에요.",
      style: "지금 이 순간의 감정과 분위기를 소중히 여기며, 억지스럽지 않은 가까움에 끌려요.",
      strength: "상대가 긴장하지 않도록 관계를 자연스럽고 따뜻하게 만들어줘요.",
      caution: "갈등을 피하려다 마음을 숨길 수 있으니, 서운함도 관계를 위한 표현이라고 생각해보세요."
    },
    INFP: {
      summary: "이상과 진심이 함께 움직이는, 섬세한 로맨틱 타입이에요.",
      style: "겉보다 마음의 의미를 중요하게 여기고, 진정성 있는 연결이 생기면 깊게 빠져들어요.",
      strength: "상대를 특별하게 바라보는 시선이 있고, 관계에 감정적 깊이를 더해줘요.",
      caution: "이상적인 기대가 커질수록 현실과의 간격이 느껴질 수 있으니, 속도를 천천히 맞춰보세요."
    },
    INTP: {
      summary: "조용한 거리감 속에서도 자신만의 방식으로 애정을 쌓아가는 타입이에요.",
      style: "가벼운 감정보다 생각의 합과 대화의 밀도를 중요하게 보며, 편안할수록 더 진짜 모습을 보여줘요.",
      strength: "관계를 감정에만 끌려가지 않고, 균형 있게 바라보는 힘이 있어요.",
      caution: "마음을 머릿속에서만 정리하지 말고, 상대가 느낄 수 있게 표현으로 연결해보세요."
    },
    ESTP: {
      summary: "생동감 있는 에너지로 관계를 빠르게 움직이게 하는 타입이에요.",
      style: "직접 부딪히고 경험을 함께하며 가까워지고, 답답한 흐름보다 즉각적인 교감을 좋아해요.",
      strength: "분위기를 살리고 관계에 활력을 불어넣는 데 강해요.",
      caution: "순간의 감각이 앞서갈 수 있으니, 상대의 속도와 안정감도 함께 챙겨보세요."
    },
    ESFP: {
      summary: "따뜻한 표현력과 밝은 에너지로 사랑을 즐겁게 만드는 타입이에요.",
      style: "좋아하는 감정을 숨기기보다 자연스럽게 나누며, 함께 있는 시간의 행복을 크게 느껴요.",
      strength: "상대가 사랑받고 있다고 체감하게 만드는 표현력이 좋아요.",
      caution: "분위기와 감정에 몰입하다 보면 중요한 현실 조율이 늦어질 수 있으니 균형을 챙겨보세요."
    },
    ENFP: {
      summary: "설렘과 진심을 동시에 움직이게 하는, 생기 있는 관계 메이커예요.",
      style: "대화와 공감으로 금세 가까워지며, 서로의 가능성을 키워가는 연애를 좋아해요.",
      strength: "분위기를 밝게 만들고, 상대의 감정을 민감하게 포착해 관계를 따뜻하게 이끌어요.",
      caution: "기대가 커질수록 속도가 빨라질 수 있으니, 중요한 장면일수록 서로의 현실 감각도 함께 확인해보세요."
    },
    ENTP: {
      summary: "호기심과 재치로 관계를 흥미롭게 만드는 유연한 연애 타입이에요.",
      style: "가벼운 템포 속에서도 생각이 잘 통하는 상대에게 오래 끌리며, 틀에 갇히지 않은 관계를 선호해요.",
      strength: "새로운 자극과 대화로 관계를 지루하지 않게 유지하는 힘이 있어요.",
      caution: "가벼워 보인다는 오해를 받을 수 있으니, 진심이 생겼을 때는 분명한 언어도 필요해요."
    },
    ESTJ: {
      summary: "분명한 태도와 책임감으로 관계를 안정적으로 이끄는 타입이에요.",
      style: "관계의 방향이 보일수록 더 편안해지고, 신뢰할 수 있는 구조 안에서 애정을 보여줘요.",
      strength: "약속과 기준을 잘 세워 관계를 흔들리지 않게 만들어요.",
      caution: "정답을 제시하려는 태도가 상대에겐 압박으로 느껴질 수 있으니 감정 확인을 먼저 해보세요."
    },
    ESFJ: {
      summary: "관계를 따뜻하고 선명하게 돌보는, 애정 표현이 풍부한 타입이에요.",
      style: "서로의 마음이 잘 오가는 안정적인 관계를 좋아하고, 배려와 표현으로 친밀감을 키워가요.",
      strength: "상대가 원하는 반응을 잘 살피고, 사랑을 일상 속 행동으로 꾸준히 보여줘요.",
      caution: "상대 반응에 너무 맞추다 보면 지칠 수 있으니, 내 감정과 필요도 함께 챙겨주세요."
    },
    ENFJ: {
      summary: "상대의 마음과 관계의 방향을 함께 이끄는 따뜻한 리더형 타입이에요.",
      style: "감정 교류와 성장의 감각을 함께 중요하게 보며, 서로에게 좋은 영향을 주는 관계를 선호해요.",
      strength: "상대를 북돋우고 관계를 더 좋은 방향으로 움직이게 하는 힘이 있어요.",
      caution: "상대를 위해 애쓰는 만큼 내 기대도 커질 수 있으니, 일방적으로 책임지려 하지 않아도 괜찮아요."
    },
    ENTJ: {
      summary: "분명한 의지와 추진력으로 사랑도 또렷하게 만들어가는 타입이에요.",
      style: "애매한 흐름보다 방향이 있는 관계를 선호하고, 마음이 정해지면 행동도 빠른 편이에요.",
      strength: "관계를 오래 보기 위한 결정과 실행이 빠르고, 현실적인 문제 해결에 강해요.",
      caution: "효율적인 접근이 감정적 여유를 덜어낼 수 있으니, 상대의 속도와 감정을 충분히 듣는 장면이 필요해요."
    }
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
    progressLabel: document.getElementById("progress-label"),
    progressFill: document.getElementById("progress-fill"),
    questionDimension: document.getElementById("question-dimension"),
    questionTheme: document.getElementById("question-theme"),
    questionTitle: document.getElementById("question-title"),
    choiceButtons: Array.prototype.slice.call(document.querySelectorAll(".choice-card")),
    resultCode: document.getElementById("result-title"),
    resultStrength: document.getElementById("result-strength"),
    resultSummary: document.getElementById("result-summary"),
    axisList: document.getElementById("axis-list"),
    styleText: document.getElementById("style-text"),
    strengthText: document.getElementById("strength-text"),
    cautionText: document.getElementById("caution-text"),
    shareButton: document.getElementById("share-button"),
    retryButton: document.getElementById("retry-button"),
    revisitNote: document.getElementById("revisit-note")
  };

  var state = {
    dataset: null,
    currentQuestionIndex: 0,
    answers: [],
    axisCounts: createAxisCounts(),
    resultPayload: null
  };

  function createAxisCounts() {
    return {
      EI: { E: 0, I: 0 },
      SN: { S: 0, N: 0 },
      TF: { T: 0, F: 0 },
      JP: { J: 0, P: 0 }
    };
  }

  function resetTestState() {
    state.currentQuestionIndex = 0;
    state.answers = [];
    state.axisCounts = createAxisCounts();
    state.resultPayload = null;
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

  function setLoadStatus(message) {
    elements.loadStatus.textContent = message || "";
  }

  function sanitizeJsonText(text) {
    return text.replace(/^\s*\/\/.*$/gm, "").trim();
  }

  function loadLovetypeData() {
    return fetch(DATA_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("문항 데이터를 불러오지 못했습니다.");
        }

        return response.text();
      })
      .then(function (rawText) {
        var parsed = JSON.parse(sanitizeJsonText(rawText));

        if (!parsed.questions || !parsed.questions.length) {
          throw new Error("문항 데이터가 비어 있습니다.");
        }

        return parsed;
      });
  }

  function startTest() {
    if (!state.dataset) {
      setLoadStatus("문항 데이터를 준비하는 중이에요.");
      return;
    }

    resetTestState();
    setLoadStatus("");
    showScreen("question");
    renderQuestion();
  }

  function renderQuestion() {
    var question = state.dataset.questions[state.currentQuestionIndex];
    var totalQuestions = state.dataset.totalQuestions;
    var questionNumber = state.currentQuestionIndex + 1;
    var progressPercent = (questionNumber / totalQuestions) * 100;

    elements.progressLabel.textContent = questionNumber + " / " + totalQuestions;
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

  function recordAnswer(question, option) {
    state.answers.push({
      id: question.id,
      dimension: question.dimension,
      optionKey: option.key,
      score: option.score
    });

    Object.keys(option.score).forEach(function (letter) {
      state.axisCounts[question.dimension][letter] += option.score[letter];
    });
  }

  function getStrengthLabel(difference) {
    if (difference >= 3) {
      return "강";
    }

    if (difference === 2) {
      return "중";
    }

    return "약";
  }

  function buildAxisScore(axisKey) {
    var axisMeta = AXIS_META[axisKey];
    var leftCount = state.axisCounts[axisKey][axisMeta.left];
    var rightCount = state.axisCounts[axisKey][axisMeta.right];
    var total = leftCount + rightCount;
    var dominantLetter = leftCount >= rightCount ? axisMeta.left : axisMeta.right;
    var dominantLabel = leftCount >= rightCount ? axisMeta.leftLabel : axisMeta.rightLabel;
    var dominantCount = leftCount >= rightCount ? leftCount : rightCount;
    var difference = Math.abs(leftCount - rightCount);

    return {
      axis: axisKey,
      leftLetter: axisMeta.left,
      rightLetter: axisMeta.right,
      leftLabel: axisMeta.leftLabel,
      rightLabel: axisMeta.rightLabel,
      leftCount: leftCount,
      rightCount: rightCount,
      total: total,
      dominantLetter: dominantLetter,
      dominantLabel: dominantLabel,
      dominantCount: dominantCount,
      difference: difference,
      strength: getStrengthLabel(difference),
      percentage: total ? Math.round((dominantCount / total) * 100) : 50
    };
  }

  function getDescriptionForResult(mbtiResult) {
    return descriptionMap[mbtiResult] || descriptionMap.default;
  }

  function calculateResult() {
    var axisScores = AXIS_ORDER.map(buildAxisScore);
    var mbtiResult = axisScores.map(function (axisScore) {
      return axisScore.dominantLetter;
    }).join("");
    var strengthText = axisScores.map(function (axisScore) {
      return axisScore.dominantLabel + "-" + axisScore.strength;
    }).join(" / ");
    var description = getDescriptionForResult(mbtiResult);

    return {
      mbtiResult: mbtiResult,
      axisScores: axisScores,
      strengthText: strengthText,
      summary: description.summary,
      detail: {
        style: description.style,
        strength: description.strength,
        caution: description.caution
      }
    };
  }

  function saveResult(resultPayload) {
    var todayInfo = getKstDateInfo(new Date());

    window.localStorage.setItem(STORAGE_COMPLETED_DATE_KEY, todayInfo.dateString);
    window.localStorage.setItem(STORAGE_RESULT_KEY, resultPayload.mbtiResult);
    window.localStorage.setItem(STORAGE_AXIS_KEY, JSON.stringify(resultPayload.axisScores));
    window.localStorage.setItem(STORAGE_SUMMARY_KEY, resultPayload.summary);
    window.localStorage.setItem(STORAGE_DETAIL_KEY, JSON.stringify(resultPayload.detail));
    window.localStorage.setItem(STORAGE_NEXT_AVAILABLE_KEY, todayInfo.nextAvailableAt);
  }

  function renderAxisScores(axisScores) {
    elements.axisList.innerHTML = "";

    axisScores.forEach(function (axisScore) {
      var row = document.createElement("div");
      row.className = "axis-row";

      var head = document.createElement("div");
      head.className = "axis-head";

      var name = document.createElement("span");
      name.className = "axis-name";
      name.textContent = axisScore.leftLabel + " / " + axisScore.rightLabel;

      var value = document.createElement("span");
      value.className = "axis-value";
      value.textContent = axisScore.dominantLabel + " " + axisScore.dominantCount + " : "
        + (axisScore.total - axisScore.dominantCount) + " (" + axisScore.strength + ")";

      var track = document.createElement("div");
      track.className = "axis-track";
      track.setAttribute("role", "img");
      track.setAttribute(
        "aria-label",
        axisScore.leftLabel + " " + axisScore.leftCount + ", "
        + axisScore.rightLabel + " " + axisScore.rightCount
      );

      var bar = document.createElement("div");
      bar.className = "axis-bar";
      bar.style.width = axisScore.percentage + "%";

      var split = document.createElement("div");
      split.className = "axis-split";
      split.style.width = (100 - axisScore.percentage) + "%";

      head.appendChild(name);
      head.appendChild(value);
      track.appendChild(bar);
      track.appendChild(split);
      row.appendChild(head);
      row.appendChild(track);
      elements.axisList.appendChild(row);
    });
  }

  function renderResult(resultPayload, isLocked) {
    state.resultPayload = resultPayload;
    showScreen("result");
    elements.resultCode.textContent = resultPayload.mbtiResult;
    elements.resultStrength.textContent = resultPayload.strengthText;
    elements.resultSummary.textContent = resultPayload.summary;
    elements.styleText.textContent = resultPayload.detail.style;
    elements.strengthText.textContent = resultPayload.detail.strength;
    elements.cautionText.textContent = resultPayload.detail.caution;
    elements.revisitNote.hidden = !isLocked;
    elements.retryButton.disabled = isLocked;
    renderAxisScores(resultPayload.axisScores);
  }

  function completeTest() {
    var resultPayload = calculateResult();
    saveResult(resultPayload);
    renderResult(resultPayload, true);
  }

  function handleChoice(index) {
    var question = state.dataset.questions[state.currentQuestionIndex];
    var option = question.options[index];

    recordAnswer(question, option);

    if (state.currentQuestionIndex === state.dataset.questions.length - 1) {
      completeTest();
      return;
    }

    state.currentQuestionIndex += 1;
    renderQuestion();
  }

  function rebuildStoredResult() {
    var completedDate = window.localStorage.getItem(STORAGE_COMPLETED_DATE_KEY);
    var today = getKstDateInfo(new Date()).dateString;

    if (completedDate !== today) {
      return null;
    }

    var mbtiResult = window.localStorage.getItem(STORAGE_RESULT_KEY);
    var axisScoresText = window.localStorage.getItem(STORAGE_AXIS_KEY);
    var summary = window.localStorage.getItem(STORAGE_SUMMARY_KEY);
    var detailText = window.localStorage.getItem(STORAGE_DETAIL_KEY);

    if (!mbtiResult || !axisScoresText || !summary || !detailText) {
      return null;
    }

    return {
      mbtiResult: mbtiResult,
      axisScores: JSON.parse(axisScoresText),
      strengthText: JSON.parse(axisScoresText).map(function (axisScore) {
        return axisScore.dominantLabel + "-" + axisScore.strength;
      }).join(" / "),
      summary: summary,
      detail: JSON.parse(detailText)
    };
  }

  function shareResult() {
    if (!state.resultPayload) {
      return;
    }

    var shareText = [
      "LoveType MBTI 연애유형 결과",
      state.resultPayload.mbtiResult,
      state.resultPayload.strengthText,
      state.resultPayload.summary
    ].join("\n");

    if (navigator.share) {
      navigator.share({
        title: "LoveType MBTI 연애유형 결과",
        text: shareText,
        url: window.location.href
      }).catch(function () {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(function () {
        window.alert("결과 문구를 복사했어요.");
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
    elements.retryButton.addEventListener("click", function () {
      if (!elements.retryButton.disabled) {
        startTest();
      }
    });
  }

  function initializeFlow() {
    var storedResult = rebuildStoredResult();

    if (storedResult) {
      renderResult(storedResult, true);
      return;
    }

    showScreen("landing");
  }

  function initializeData() {
    elements.startButton.disabled = true;
    setLoadStatus("문항 데이터를 불러오는 중이에요.");

    loadLovetypeData()
      .then(function (dataset) {
        state.dataset = dataset;
        elements.startButton.disabled = false;
        setLoadStatus("");
        initializeFlow();
      })
      .catch(function () {
        setLoadStatus("문항 데이터를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.");
      });
  }

  initializeTheme();
  initializeEvents();
  initializeData();

  // Extension point: split question rendering into its own module when pages are separated.
  // Extension point: move MBTI descriptionMap to a dedicated result data file.
})();
