Pod::Spec.new do |s|
  s.name           = 'HangerVision'
  s.version        = '0.1.0'
  s.summary        = 'Vision and Foundation Models bridge for Hanger'
  s.description    = 'Background removal, pixel sampling, OCR and Apple Intelligence tagging.'
  s.author         = 'Hanger'
  s.homepage       = 'https://github.com/nikitaiatskin/vmir'
  s.platforms      = { :ios => '17.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.10'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  # FoundationModels is weak-linked so the app still launches on iOS 17–25.
  s.weak_frameworks = 'FoundationModels'

  s.source_files = "**/*.{h,m,mm,swift}"
  s.exclude_files = "Tests/**/*"
end
