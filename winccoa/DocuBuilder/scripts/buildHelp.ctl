//-----------------------------------------------------------------------------
/**
  @file $relPath
  @copyright Copyright 2026 winccoa-tools-pack
             SPDX-License-Identifier: MIT
  @brief Generate WinCC OA Online Help / Doxygen docs for the worker project.
  @details Invoked via the DocuBuilder non-runnable sub-project:

           WCCOActrl -config <worker>/config/config -n -log +stderr
             buildHelp.ctl <CompanyName>

           Sets GlobalStorage company/name and advanced doxygen config, then
           runs DoxygenGenerator and OnlineHelp packaging. UI managers may open
           the generated help; CTRL managers exit after generation.
  @AIgeneratedHelpContent
*/

#uses "classes/doxygen/DoxygenCtrlExt"
#uses "classes/doxygen/DoxygenGenerator"

//-----------------------------------------------------------------------------
/**
  @brief Build project documentation.

  @param companyName Organization / company label written into help metadata.
*/
main(const string &companyName)
{
  GlobalStorage storage;
  storage.setValue("doxygen/advancedConfig", 1);
  storage.setValue("company/name", companyName);

  DoxygenGenerator doxy;
  doxy.createAll();

  // Register and open the Online Help.
  OnlineHelp help;
  DoxygenSettings doxySettings;
  help.adjustReferences(doxySettings.getOutputDirectory());
  help.generateCustomHelp(doxySettings.getOutputDirectory());

  if (myManType() == UI_MAN)
  {
    help.open(doxySettings.getVirtualFolder() + "/index.html", "",
              doxySettings.getQhpNameSpace());
  }
}
