document.addEventListener('DOMContentLoaded', () => {
  const ctaButton = document.querySelector('.cta-button');

  if (!ctaButton) return;

  ctaButton.addEventListener('click', () => {
    ctaButton.classList.add('cta-button--active');

    setTimeout(() => {
      ctaButton.classList.remove('cta-button--active');
    }, 600);

    const targetSelector = ctaButton.getAttribute('data-scroll-target');
    if (targetSelector) {
      const target = document.querySelector(targetSelector);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});


// Handle membership form submission, invoke API, and redirect to plan
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.membership__form');
  if (!form) return;

  const resultContainer = form.querySelector('.form-result');
  const resultPre = form.querySelector('.form-result__json');
  const resultHeading = form.querySelector('.form-result h3');

  const submitButton = form.querySelector('.submit-button');
  const API_URL = 'http://localhost:8000/gemini';

  const showLoadingState = () => {
    if (!resultContainer) return;

    resultContainer.hidden = false;
    resultContainer.classList.remove('form-result--success');
    resultContainer.classList.add('form-result--loading');

    if (resultHeading) {
      resultHeading.textContent = 'Generating Your Plan';
    }

    if (resultPre) {
      resultPre.innerHTML = `
        <div class="form-result__spinner">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p class="form-result__message">
          Crafting your personalized workouts, nutrition, and tips. This usually takes a few seconds.
        </p>
      `;
    }
  };

  const showSuccessState = () => {
    if (!resultContainer) return;

    resultContainer.hidden = false;
    resultContainer.classList.remove('form-result--loading');
    resultContainer.classList.add('form-result--success');

    if (resultHeading) {
      resultHeading.textContent = 'Plan Ready!';
    }

    if (resultPre) {
      resultPre.innerHTML = `
        <p class="form-result__message">
          Redirecting you to your personalized home screen. Get ready to train smart.
        </p>
      `;
    }
  };

  const showErrorState = (message) => {
    if (!resultContainer) return;

    resultContainer.hidden = false;
    resultContainer.classList.remove('form-result--loading', 'form-result--success');

    if (resultHeading) {
      resultHeading.textContent = 'Unable to Generate Plan';
    }

    if (resultPre) {
      resultPre.textContent = message;
    }
  };

  const safeJsonParsePlan = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return null;

    let cleaned = rawText.trim();

    // If Gemini wraps JSON in markdown code fences, strip them
    const fenceMatch = cleaned.match(/```(?:json)?([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1]) {
      cleaned = fenceMatch[1].trim();
    }

    // If there is explanatory text around the JSON, try to isolate the first {...} block
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleaned, (key, value) =>
        key === 'restSec' && value === '' ? null : value
      );
    } catch {
      return null;
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    const times = Array.from(form.querySelectorAll('input[name="times"]:checked')).map(
      (input) => input.value
    );

    const submission = {
      name: formData.get('name') || '',
      phone: formData.get('phone') || '',
      age: formData.get('age') ? Number(formData.get('age')) : null,
      heightCm: formData.get('height') ? Number(formData.get('height')) : null,
      weightKg: formData.get('weight') ? Number(formData.get('weight')) : null,
      goal: formData.get('goal') || '',
      trainingDaysPerWeek: formData.get('frequency') ? Number(formData.get('frequency')) : null,
      preferredTimes: times,
      notes: formData.get('message') || '',
      submittedAtIso: new Date().toISOString(),
    };

    showLoadingState();
    submitButton?.setAttribute('disabled', 'true');

    try {
      const payload = submission;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unexpected response from the API');
      }

      let parsedPlan = null;

      if (typeof data.response === 'string') {
        const planText = data.response.trim();
        if (planText) {
          parsedPlan = safeJsonParsePlan(planText);
        }
      } else if (data.response && typeof data.response === 'object') {
        parsedPlan = data.response;
      }

      if (!parsedPlan) {
        throw new Error('Received plan could not be parsed. Please try again.');
      }

      localStorage.setItem('gymHeroPlan', JSON.stringify(parsedPlan));

      showSuccessState();

      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1200);
    } catch (error) {
      showErrorState(
        `We ran into an issue. ${error.message || 'Please try again in a moment.'}`
      );
    } finally {
      submitButton?.removeAttribute('disabled');
    }

    resultContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Render personalized plan tabs and content on the home page
document.addEventListener('DOMContentLoaded', () => {
  const planRoot = document.querySelector('[data-plan-root]');
  if (!planRoot) return;

  const placeholder = planRoot.querySelector('[data-plan-placeholder]');
  const summarySection = planRoot.querySelector('.plan__summary');
  const mainSection = planRoot.querySelector('.plan__main');
  const heroHeading = document.querySelector('[data-plan-heading]');
  const heroSummary = document.querySelector('[data-plan-summary]');
  const heroEyebrow = document.querySelector('[data-plan-eyebrow]');

  let planData = window.planData;
  if (!planData) {
    const storedPlan = localStorage.getItem('gymHeroPlan');
    if (storedPlan) {
      try {
        planData = JSON.parse(storedPlan);
        window.planData = planData;
      } catch {
        planData = null;
      }
    }
  }

  if (!planData) {
    placeholder?.removeAttribute('hidden');
    summarySection?.setAttribute('hidden', '');
    mainSection?.setAttribute('hidden', '');
    return;
  }

  placeholder?.setAttribute('hidden', '');
  summarySection?.removeAttribute('hidden');
  mainSection?.removeAttribute('hidden');

  const { userSummary = {}, workoutPlan = [], dietPlan = {}, tips = [] } = planData;

  const formatGoal = (goal) =>
    (goal || 'Strength')
      .toString()
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const displayName = userSummary.name || 'Athlete';
  const goalLabel = formatGoal(userSummary.goal);

  if (heroEyebrow) {
    heroEyebrow.textContent = `${goalLabel} Focus`;
  }
  if (heroHeading) {
    heroHeading.textContent = `${goalLabel} Plan for ${displayName}`;
  }
  const nameTarget = planRoot.querySelector('[data-plan-name]');
  if (nameTarget) {
    nameTarget.textContent = displayName;
  }

  const trainingDays = workoutPlan.filter((day) => Array.isArray(day.exercises) && day.exercises.length);
  const recoveryDays = workoutPlan.filter((day) => !Array.isArray(day.exercises) || day.exercises.length === 0);

  if (heroSummary) {
    heroSummary.textContent =
      workoutPlan.length > 0
        ? `${trainingDays.length} training days paired with ${recoveryDays.length} recovery days to keep progress sustainable.`
        : 'Your plan blends structured training, mindful recovery, and balanced nutrition to keep progress sustainable.';
  }

  const statsTarget = planRoot.querySelector('[data-plan-stats]');
  if (statsTarget) {
    const stats = [
      userSummary.age != null && { label: 'Age', value: userSummary.age },
      userSummary.heightCm != null && { label: 'Height', value: `${userSummary.heightCm} cm` },
      userSummary.weightKg != null && { label: 'Weight', value: `${userSummary.weightKg} kg` },
      { label: 'Training Days', value: trainingDays.length },
    ].filter(Boolean);

    statsTarget.innerHTML = stats
      .map(
        (stat) => `
        <li>
          <span>${stat.label}</span>
          <strong>${stat.value}</strong>
        </li>
      `
      )
      .join('');
  }

  const goalTarget = planRoot.querySelector('[data-plan-goal]');
  if (goalTarget) {
    goalTarget.textContent = `${goalLabel} focus`;
  }

  const scheduleTarget = planRoot.querySelector('[data-plan-schedule]');
  if (scheduleTarget) {
    const trainingSchedule = trainingDays.map((day) => day.day).join(', ');
    const recoverySchedule = recoveryDays.map((day) => day.day).join(', ');
    const parts = [];

    if (trainingSchedule) {
      parts.push(`Training: ${trainingSchedule}`);
    }
    if (recoverySchedule) {
      parts.push(`Recovery: ${recoverySchedule}`);
    }

    scheduleTarget.textContent = parts.join(' • ') || 'Flexible schedule tailored to your preferences.';
  }

  const tabsContainer = planRoot.querySelector('[data-plan-tabs]');
  const panelsContainer = planRoot.querySelector('[data-plan-panels]');

  if (!tabsContainer || !panelsContainer) return;

  const slugify = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'tab';

  const createOverviewContent = () => {
    const snacks = Array.isArray(dietPlan.snacks) ? dietPlan.snacks : [];
    const snacksList = snacks.map((snack) => `<li>${snack}</li>`).join('');
    const tipsList = Array.isArray(tips) ? tips : [];

    return `
      <div class="plan-overview">
        <div class="plan-card">
          <h3>Weekly Rhythm</h3>
          <p>${trainingDays.length} focused strength sessions balanced with intentional recovery days to keep you progressing without burnout.</p>
        </div>
        <div class="plan-card">
          <h3>Daily Nutrition</h3>
          <ul class="plan-list plan-list--stacked">
            ${
              dietPlan.breakfast
                ? `<li><span>Breakfast</span>${dietPlan.breakfast}</li>`
                : ''
            }
            ${
              dietPlan.lunch ? `<li><span>Lunch</span>${dietPlan.lunch}</li>` : ''
            }
            ${
              dietPlan.dinner
                ? `<li><span>Dinner</span>${dietPlan.dinner}</li>`
                : ''
            }
            ${
              snacks.length
                ? `<li><span>Snacks</span>
              <ul class="plan-list plan-list--stacked">
                ${snacksList}
              </ul>
            </li>`
                : ''
            }
          </ul>
        </div>
        <div class="plan-card">
          <h3>Coaching Notes</h3>
          <ul class="plan-list">
            ${tipsList.map((tip) => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  };

  const createDayPanelContent = (day) => {
    if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
      return `
      <div class="plan-day">
        <p class="plan-day__focus">${day.focus}</p>
        <div class="plan-day__rest">
          Take today to move gently: consider light stretching, an easy walk, or play. Prioritize sleep and hydration to stay ready for the next session.
        </div>
      </div>
    `;
    }

    const rows = day.exercises
      .map((exercise) => {
        const sets = exercise.sets ?? '—';
        const reps = exercise.reps ?? '—';
        let rest = exercise.restSec ?? '—';

        if (typeof rest === 'number') {
          rest = rest === 0 ? '—' : `${rest}s`;
        }

        return `
          <tr>
            <td>${exercise.name}</td>
            <td>${sets}</td>
            <td>${reps}</td>
            <td>${rest}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div class="plan-day">
        <p class="plan-day__focus">${day.focus}</p>
        <table class="plan-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Sets</th>
              <th>Reps</th>
              <th>Rest</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };

  const tabsData = [
    {
      id: 'overview',
      label: 'Overview',
      content: createOverviewContent(),
    },
    ...workoutPlan.map((day) => {
      const dayLabel = day.day || 'Planned Session';
      const isRecovery = !day.exercises || day.exercises.length === 0;
      const label = isRecovery ? `${dayLabel.split(',')[0]} (Recovery)` : dayLabel;
      return {
        id: slugify(dayLabel),
        label,
        content: createDayPanelContent(day),
      };
    }),
  ];

  tabsContainer.innerHTML = tabsData
    .map(
      (tab, index) => `
        <button
          type="button"
          class="plan-tabs__button${index === 0 ? ' is-active' : ''}"
          data-tab="${tab.id}"
        >
          ${tab.label}
        </button>
      `
    )
    .join('');

  panelsContainer.innerHTML = tabsData
    .map(
      (tab, index) => `
        <article class="plan-panel${index === 0 ? ' is-active' : ''}" data-panel="${tab.id}">
          ${tab.content}
        </article>
      `
    )
    .join('');

  const tabButtons = tabsContainer.querySelectorAll('.plan-tabs__button');
  const panels = panelsContainer.querySelectorAll('.plan-panel');

  const setActiveTab = (targetId) => {
    tabButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tab === targetId);
    });

    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === targetId);
    });
  };

  tabsContainer.addEventListener('click', (event) => {
    const button = event.target.closest('.plan-tabs__button');
    if (!button) return;
    setActiveTab(button.dataset.tab);
  });
});