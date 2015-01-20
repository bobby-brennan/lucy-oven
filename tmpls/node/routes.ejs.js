<% if (setupFile) { -%>
<%- include(setupFile, answers) %>
<% }             -%>

exports.setRoutes = function(App) {
<% routes.forEach(function(route) {    -%>
   App.post('<%- route.path %>', function(req, res) {
      <%- include(route.file, answers) %>
   })
<% }) -%>
}
