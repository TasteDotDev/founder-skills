Name:           founder
Version:        0.1.0
Release:        1
Summary:        Business consultant in your terminal — 523 frameworks, any LLM
License:        MIT
URL:            https://github.com/TasteDotDev/FounderSkills

%description
Founder CLI gives you access to 523 business frameworks across 15 categories.
Works with Anthropic Claude, OpenAI, Google Gemini, OpenRouter, or any
OpenAI-compatible endpoint.

%install
mkdir -p %{buildroot}/usr/bin
cp %{_sourcedir}/founder %{buildroot}/usr/bin/founder
chmod 755 %{buildroot}/usr/bin/founder

%files
/usr/bin/founder
