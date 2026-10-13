export function getGoalEditLabels(isArabic: boolean) {
  return {
    title: isArabic ? 'تعديل معلومات الهدف' : 'Edit goal details',
    subtitle: isArabic
      ? 'حدّث بيانات الهدف، الفترة الزمنية، والنقاط المستهدفة بسهولة.'
      : 'Update goal details, timeline, and target points easily.',
    goalInfo: isArabic ? 'معلومات الهدف الأساسية' : 'Goal Information',
    iconHint: isArabic ? 'انقر الأيقونة لتغييرها' : 'Click icon to change',
    descriptionLabel: isArabic ? 'وصف الهدف أو الدافع (اختياري)' : 'Goal description or motivation (optional)',
    descriptionPlaceholder: isArabic ? 'اكتب وصفاً أو دافعاً للهدف (اختياري)...' : 'Write a brief description or motivation for this goal...',
    timeline: isArabic ? 'الجدول الزمني' : 'Timeline',
    pointsAndProgress: isArabic ? 'النقاط المستهدفة والتقدم' : 'Target Points & Progress',
    startDate: isArabic ? 'تاريخ البدء' : 'Start date',
    endDate: isArabic ? 'تاريخ الانتهاء' : 'End date',
    selectDate: isArabic ? 'اختر تاريخاً' : 'Select date',
    currentProgress: isArabic ? 'نسبة الإنجاز' : 'Current progress',
    currentPoints: isArabic ? 'النقاط الحالية' : 'Current points',
    currentPointsHint: isArabic ? 'المكتسبة حتى الآن' : 'Earned so far',
    targetPoints: isArabic ? 'النقاط المستهدفة' : 'Target points',
    targetPointsHint: isArabic ? 'إجمالي نقاط الهدف' : 'Goal total points',
    duration: isArabic ? 'مدة الخطة' : 'Plan duration',
    dailyPace: isArabic ? 'المعدل اليومي' : 'Daily pace',
    finalTarget: isArabic ? 'الهدف النهائي' : 'Final target',
    taskPointsSuggestion: isArabic ? 'مجموع نقاط المهام المحسوبة:' : 'Calculated task points total:',
    applyTaskPoints: isArabic ? 'اعتماد المجموع' : 'Apply total',
    taskPointsMatched: isArabic ? 'متطابق مع خطة المهام' : 'Matches task plan',
    totalDurationBadge: isArabic ? 'إجمالي الخطة' : 'Total duration',
    remainingBadge: isArabic ? 'متبقٍ' : 'left',
    levelLabel: isArabic ? 'المستوى' : 'Level',
    nextLevelLabel: isArabic ? 'المستوى التالي:' : 'Next Level:',
    pointsLeftToNext: isArabic ? 'متبقي' : 'left',
    scorableTasksCount: isArabic ? 'مهام' : 'tasks',
    daysUnit: isArabic ? 'يوم' : 'days',
    pointsUnit: isArabic ? 'نقطة' : 'pts',
    paceUnit: isArabic ? 'نقطة/يوم' : 'pts/day',
    titleRequired: isArabic ? 'اكتب اسم الهدف أولاً.' : 'Enter a goal title first.',
    dateRequired: isArabic ? 'حدد تاريخ البدء وتاريخ الانتهاء.' : 'Select both a start date and end date.',
    endDateError: isArabic ? 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.' : 'The end date must be after the start date.',
    currentPointsError: isArabic ? 'النقاط الحالية يجب أن تكون صفر أو أكثر.' : 'Current points must be zero or more.',
    pointsError: isArabic ? 'النقاط المستهدفة يجب أن تكون أكبر من صفر.' : 'Target points must be greater than zero.',
    saveError: isArabic ? 'تعذر حفظ التعديلات. حاول مرة ثانية.' : 'Could not save your changes. Please try again.',
  };
}

export function getGoalEditAiLabels(isArabic: boolean) {
  return {
    tabManual: isArabic ? 'تعديل يدوي' : 'Manual Edit',
    tabAi: isArabic ? 'تعديل بالذكاء الاصطناعي' : 'AI Edit',
    aiTitle: isArabic ? 'التعديل الذكي بالذكاء الاصطناعي' : 'Smart AI Editing',
    aiSubtitle: isArabic 
      ? 'اكتب التغييرات التي تريدها (مثل: "مدد الهدف لنهاية السنة" أو "غير النقاط إلى 360") وسيقوم الذكاء الاصطناعي بتحديث الحقول فوراً.'
      : 'Describe the changes you want (e.g. "Extend goal to end of year" or "Change points to 360") and the AI will update the details instantly.',
    aiTextareaPlaceholder: isArabic
      ? 'مثال: غير العنوان إلى "تعلم البرمجة المتقدمة" ومدد تاريخ الانتهاء لشهر سبتمبر القادم...'
      : 'Example: Change title to "Advanced Programming" and extend the end date to next September...',
    aiButton: isArabic ? 'معالجة بالذكاء الاصطناعي' : 'Process with AI',
    aiProcessing: isArabic ? 'جاري التحليل والمعالجة...' : 'Analyzing and processing...',
    aiSuccess: isArabic ? 'تم تحديث الحقول بنجاح! راجع التعديلات أدناه ثم احفظ التغييرات.' : 'Fields updated successfully! Review the adjustments below and save.',
    aiSuccessPreviewTitle: isArabic ? 'معاينة الخطة المحدثة' : 'Updated Plan Preview',
    aiPromptLabel: isArabic ? 'ما الذي ترغب في تعديله؟' : 'What would you like to edit?',
    changesTitle: isArabic ? 'تعديلات المهام المقترحة' : 'Proposed task changes',
    changesHint: isArabic
      ? 'راجعها قبل الحفظ. تقدر تتجاهل أي تعديل ما يعجبك.'
      : 'Review before saving. You can discard any change you do not want.',
    opUpdate: isArabic ? 'تعديل' : 'Edit',
    opAdd: isArabic ? 'إضافة' : 'Add',
    opRemove: isArabic ? 'حذف' : 'Remove',
    discard: isArabic ? 'تجاهل' : 'Discard',
    historyWarning: isArabic
      ? 'سيُحذف معه سجل الإنجاز'
      : 'its completion history goes with it',
    unknownTask: isArabic ? '(مهمة غير معروفة)' : '(unknown task)',
    minutes: isArabic ? 'دقيقة' : 'min',
    daily: isArabic ? 'يومي' : 'daily',
    weekly: isArabic ? 'أسبوعي' : 'weekly',
    weight: isArabic ? 'الوزن' : 'weight',
    subOf: isArabic ? 'مهمة' : 'task',
    mainTask: isArabic ? 'مهمة' : 'task',
    taskSaveError: isArabic
      ? 'حُفظ الهدف، لكن تعذر حفظ تعديلات المهام.'
      : 'The goal was saved, but the task changes could not be applied.',
  };
}
